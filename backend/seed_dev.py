"""
Development seed: fills the database with realistic data covering every state the
app can be in, so all flows can be exercised without hand-crafting records.

    python seed_dev.py            # add/refresh seed data, leave other rows alone
    python seed_dev.py --reset    # delete ALL existing data first, then seed

Creates:
  * 1 admin, 4 customers
  * 10 vendors across real Nairobi neighbourhoods, with Kenyan street-food menus
      - 7 currently OPEN (varying time left on the freshness timer)
      - 2 EXPIRED (past auto_close_at - should be invisible to customers)
      - 1 never checked in (no location row)
  * ~20 orders spanning Pending Payment / Paid / Payment Failed
  * a matching Transaction for every order (PENDING / SUCCESSFUL / FAILED)

Safe by construction: refuses to run against anything that is not a local database
unless --force is passed, so it cannot be pointed at production by accident.
"""
import argparse
import random
import sys
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import User, VendorLocation, Order, Transaction

random.seed(42)  # reproducible runs

PASSWORD = 'Password123'

# (business, username, email, lat, lon, address, menu, hours_left)
#   hours_left > 0  -> open, that many hours remain on the timer
#   hours_left <= 0 -> expired that many hours ago
#   hours_left None -> never checked in (no location row at all)
VENDORS = [
    ('Mama Njeri Kibandaski', 'mama_njeri', 'njeri@hyperlocal.co.ke',
     -1.2864, 36.8172, 'Kimathi Street, Nairobi CBD', [
         ('Ugali & Sukuma', 120, 'Stone-ground ugali with fresh sukuma wiki'),
         ('Nyama Choma (¼kg)', 350, 'Charcoal-grilled goat, kachumbari on the side'),
         ('Chapati', 30, 'Soft, layered, straight off the pan'),
         ('Githeri', 100, 'Maize and beans slow-cooked with onion and tomato'),
     ], 2.5),

    ('Westlands Pilau Point', 'pilau_point', 'pilau@hyperlocal.co.ke',
     -1.2649, 36.8020, 'Woodvale Grove, Westlands', [
         ('Beef Pilau', 180, 'Fragrant spiced rice with tender beef'),
         ('Chicken Biriani', 220, 'Slow-cooked biriani with saffron rice'),
         ('Kachumbari', 50, 'Tomato, onion and coriander salad'),
     ], 1.2),

    ('Kilimani Smokies', 'kilimani_smokies', 'smokies@hyperlocal.co.ke',
     -1.2906, 36.7856, 'Argwings Kodhek Road, Kilimani', [
         ('Smokie Pasua', 60, 'Split smokie loaded with kachumbari'),
         ('Boiled Egg & Kachumbari', 50, 'Classic street-corner snack'),
         ('Mutura', 100, 'Traditional grilled sausage, deeply savoury'),
     ], 0.4),

    ('Eastleigh Bhajia House', 'bhajia_house', 'bhajia@hyperlocal.co.ke',
     -1.2745, 36.8508, 'First Avenue, Eastleigh', [
         ('Potato Bhajia', 150, 'Crispy spiced potato slices with tamarind'),
         ('Samosa (Beef)', 50, 'Hand-folded, fried to order'),
         ('Mandazi', 20, 'Lightly sweet, coconut and cardamom'),
         ('Mahamri', 25, 'Coastal-style mandazi'),
     ], 2.9),

    ('Karen Grill Shack', 'karen_grill', 'karen@hyperlocal.co.ke',
     -1.3191, 36.7062, 'Karen Road, Karen', [
         ('Nyama Choma (½kg)', 650, 'Prime goat ribs over charcoal'),
         ('Grilled Tilapia', 550, 'Whole tilapia, lemon and chilli'),
         ('Ugali', 60, 'Fresh from the sufuria'),
     ], 1.8),

    ('Kasarani Chips Corner', 'kasarani_chips', 'chips@hyperlocal.co.ke',
     -1.2233, 36.8961, 'Thika Road, Kasarani', [
         ('Chips Masala', 180, 'Hand-cut chips tossed in masala'),
         ('Chicken & Chips', 350, 'Quarter chicken with a full portion of chips'),
         ('Sausage', 60, 'Grilled beef sausage'),
     ], 2.1),

    ('Ngara Fish Fry', 'ngara_fish', 'ngara@hyperlocal.co.ke',
     -1.2740, 36.8290, 'Ngara Road, Ngara', [
         ('Fried Tilapia', 400, 'Deep-fried whole tilapia, crisp skin'),
         ('Omena', 150, 'Sun-dried silver fish in tomato'),
         ('Ugali', 60, 'Served hot'),
     ], 0.8),

    # --- expired: past the 3h freshness window, must not surface to customers ---
    ('Lang\'ata Late Night Fries', 'langata_fries', 'langata@hyperlocal.co.ke',
     -1.3630, 36.7519, 'Lang\'ata Road, Lang\'ata', [
         ('Masala Fries', 200, 'Late-night favourite'),
         ('Beef Burger', 400, 'Handmade patty, toasted bun'),
     ], -1.5),

    ('Donholm Chapo Spot', 'donholm_chapo', 'donholm@hyperlocal.co.ke',
     -1.2925, 36.8880, 'Outer Ring Road, Donholm', [
         ('Chapati Beans', 120, 'Two chapatis with stewed beans'),
         ('Chai', 40, 'Spiced milk tea'),
     ], -6.0),

    # --- registered but never checked in: no location row ---
    ('Ruaka Roast', 'ruaka_roast', 'ruaka@hyperlocal.co.ke',
     None, None, None, [], None),
]

CUSTOMERS = [
    ('wanjiku', 'wanjiku@example.com', '+254711000001'),
    ('otieno', 'otieno@example.com', '+254711000002'),
    ('achieng', 'achieng@example.com', '+254711000003'),
    ('kamau', 'kamau@example.com', '+254711000004'),
]


def _guard_target(app, force):
    uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    local = any(h in uri for h in ('localhost', '127.0.0.1', 'sqlite'))
    if not local and not force:
        sys.exit(
            f'Refusing to seed a non-local database.\n'
            f'  target: {uri.split("@")[-1] if "@" in uri else uri}\n'
            f'  pass --force if this is really what you want.'
        )
    return uri


def _wipe():
    """Delete in FK-safe order."""
    Transaction.query.delete()
    Order.query.delete()
    VendorLocation.query.delete()
    User.query.delete()
    db.session.commit()


def _menu(entries):
    return [
        {'id': name.lower().replace(' ', '-').replace('&', 'and'),
         'name': name, 'price': float(price), 'desc': desc, 'image': None}
        for name, price, desc in entries
    ]


def _upsert_user(email, **fields):
    user = User.query.filter_by(email=email).first()
    if user:
        for k, v in fields.items():
            setattr(user, k, v)
        return user
    user = User(email=email, **fields)
    db.session.add(user)
    return user


def seed(reset=False, force=False):
    app = create_app()
    with app.app_context():
        uri = _guard_target(app, force)
        print(f'Target: {uri.split("@")[-1] if "@" in uri else uri}')

        if reset:
            print('Wiping existing data...')
            _wipe()

        pw = generate_password_hash(PASSWORD)
        now = datetime.utcnow()

        # --- admin ---
        _upsert_user('admin@hyperlocal.com', username='SuperAdmin',
                     phone_number='+254712345678', password_hash=pw, role='admin',
                     business_name='HyperLocal HQ', is_verified=True)

        # --- customers ---
        customers = [
            _upsert_user(email, username=username, phone_number=phone,
                         password_hash=pw, role='customer', is_verified=True)
            for username, email, phone in CUSTOMERS
        ]

        # --- vendors ---
        vendors, open_vendors = [], []
        for i, (biz, username, email, lat, lon, addr, entries, hours) in enumerate(VENDORS):
            vendor = _upsert_user(
                email, username=username, phone_number=f'+2547220000{i:02d}',
                password_hash=pw, role='vendor', business_name=biz, is_verified=True)
            db.session.flush()
            vendors.append(vendor)

            if hours is None:
                continue

            location = VendorLocation.query.filter_by(vendor_id=vendor.id).first()
            if not location:
                location = VendorLocation(vendor_id=vendor.id)
                db.session.add(location)

            location.latitude, location.longitude, location.address = lat, lon, addr
            location.menu_items = _menu(entries)
            location.check_in()
            location.auto_close_at = now + timedelta(hours=hours)
            location.is_open = hours > 0
            if hours > 0:
                open_vendors.append((vendor, location))

        db.session.commit()

        # --- orders + transactions ---
        made = 0
        for vendor, location in open_vendors:
            for _ in range(random.randint(1, 3)):
                customer = random.choice(customers)
                picks = random.sample(location.menu_items, k=min(2, len(location.menu_items)))
                items = [{'id': p['id'], 'name': p['name'], 'price': p['price'],
                          'qty': random.randint(1, 3)} for p in picks]
                total = sum(i['price'] * i['qty'] for i in items)

                state = random.choices(
                    ['Paid', 'Preparing', 'Ready', 'Collected',
                     'Pending Payment', 'Payment Failed'],
                    weights=[4, 2, 2, 3, 2, 2])[0]
                created = now - timedelta(hours=random.uniform(0.2, 20))

                order = Order(
                    order_number=Order.generate_order_number(),
                    vendor_id=vendor.id,
                    customer_id=customer.id,
                    customer_phone=customer.phone_number,
                    total_amount=total,
                    items=items,
                    status=state,
                    delivery_location=random.choice(
                        ['Gate B, main entrance', 'Reception desk', '3rd floor landing',
                         'Blue gate opposite the kiosk', 'In-Store pickup']),
                    customer_latitude=location.latitude + random.uniform(-0.01, 0.01),
                    customer_longitude=location.longitude + random.uniform(-0.01, 0.01),
                    created_at=created,
                )
                db.session.add(order)
                db.session.flush()

                txn_status = ('PENDING' if state == 'Pending Payment'
                              else 'FAILED' if state == 'Payment Failed'
                              else 'SUCCESSFUL')
                db.session.add(Transaction(
                    vendor_id=vendor.id,
                    order_id=order.id,
                    customer_phone=customer.phone_number,
                    amount=total,
                    checkout_request_id=f'ws_CO_SEED_{order.order_number}',
                    mpesa_receipt_number=(
                        ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=10))
                        if txn_status == 'SUCCESSFUL' else None),
                    status=txn_status,
                    transaction_date=created + timedelta(seconds=random.randint(5, 90)),
                ))
                made += 1

        db.session.commit()

        print(f"""
Seeded successfully.

  admin      1   admin@hyperlocal.com
  customers  {len(customers)}
  vendors    {len(vendors)}  ({len(open_vendors)} open, 2 expired, 1 never checked in)
  orders     {made}  (+ 1 transaction each)

  Every account uses the password: {PASSWORD}

  Try:  http://localhost:5000/api/customer/nearby?lat=-1.2864&lon=36.8172&radius=5000
""")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--reset', action='store_true', help='delete all existing data first')
    ap.add_argument('--force', action='store_true', help='allow a non-local database')
    args = ap.parse_args()
    seed(reset=args.reset, force=args.force)
