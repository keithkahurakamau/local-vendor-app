import json
from datetime import datetime, timedelta

import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import (User, VendorLocation, Order, Transaction,
                        Favourite, Review, Address, Promotion)


@pytest.fixture
def app():
    """
    Build the app from the 'testing' config.

    Do NOT switch the database by assigning app.config['SQLALCHEMY_DATABASE_URI']
    after create_app() - Flask-SQLAlchemy binds the engine inside init_app(), so a
    later assignment is silently ignored and the suite would run against the real
    DATABASE_URL (and drop_all() it on teardown).
    """
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def test_suite_is_isolated_from_the_real_database(app):
    """Guard: the suite must never point at Postgres. drop_all() runs on teardown."""
    url = db.engine.url
    assert url.drivername.startswith('sqlite'), (
        f'Tests are pointed at {url.drivername!r}, not sqlite. '
        'Teardown calls drop_all() and would destroy real data.'
    )
    assert url.database in (None, ':memory:')


# --------------------------------------------------------------------------
# Fixtures for domain data
# --------------------------------------------------------------------------

def _make_vendor(email, business_name, lat, lon, menu, expired=False):
    vendor = User(
        username=email.split('@')[0],
        email=email,
        phone_number=f'+2547{abs(hash(email)) % 100000000:08d}',
        password_hash=generate_password_hash('Vendor123!'),
        role='vendor',
        business_name=business_name,
    )
    db.session.add(vendor)
    db.session.flush()

    location = VendorLocation(
        vendor_id=vendor.id,
        latitude=lat,
        longitude=lon,
        menu_items=menu,
    )
    location.check_in()
    if expired:
        location.auto_close_at = datetime.utcnow() - timedelta(hours=1)
    db.session.add(location)
    return vendor


@pytest.fixture
def seeded(app):
    """Four vendors at known distances from (0.0, 0.0), one past its freshness window."""
    vendors = {
        'samosa': _make_vendor(
            'samosa@test.com', 'Samosa King', 0.0, 0.0,
            [{'name': 'Samosa', 'desc': 'Crispy', 'price': 50}],
        ),
        # ~4.4km east - inside the 5km radius
        'pilau': _make_vendor(
            'pilau@test.com', 'Pilau Palace', 0.0, 0.04,
            [{'name': 'Pilau', 'desc': 'Spiced rice', 'price': 150},
             {'name': 'Biriani', 'desc': 'Rich', 'price': 180}],
        ),
        # ~11km east - outside the radius
        'fries': _make_vendor(
            'fries@test.com', 'Late Night Fries', 0.0, 0.1,
            [{'name': 'Fries', 'desc': 'Salty', 'price': 100}],
        ),
        # Co-located with samosa but its freshness timer has expired
        'stale': _make_vendor(
            'stale@test.com', 'Stale Food Vendor', 0.0, 0.0,
            [{'name': 'Samosa', 'desc': 'Old', 'price': 50}], expired=True,
        ),
    }
    db.session.commit()
    return vendors


def _login(client, email, password='Vendor123!'):
    response = client.post('/api/auth/login', json={'email': email, 'password': password})
    assert response.status_code == 200, response.data
    return json.loads(response.data)['token']


@pytest.fixture
def mock_stk(monkeypatch):
    """Replace the Daraja call so tests never touch the network."""
    from app.routes import customer_routes

    calls = []

    def fake_push(phone_number, amount, account_reference, transaction_desc):
        calls.append({
            'phone_number': phone_number,
            'amount': amount,
            'account_reference': account_reference,
        })
        return {'ResponseCode': '0', 'CheckoutRequestID': 'ws_CO_TEST_123'}

    monkeypatch.setattr(customer_routes.mpesa_handler, 'initiate_stk_push', fake_push)
    return calls


# --------------------------------------------------------------------------
# Discovery: freshness, radius, inventory
# --------------------------------------------------------------------------

def test_freshness_filter_excludes_expired_vendors(client, seeded):
    """A vendor past auto_close_at must not appear, even at zero distance."""
    response = client.get('/api/customer/search?item=Samosa&lat=0.0&lon=0.0')
    assert response.status_code == 200

    names = [v['name'] for v in json.loads(response.data)['vendors']]
    assert 'Samosa King' in names
    assert 'Stale Food Vendor' not in names


def test_radius_filter_excludes_vendors_beyond_5km(client, seeded):
    response = client.get('/api/customer/search?item=Fries&lat=0.0&lon=0.0')
    assert response.status_code == 200
    assert json.loads(response.data)['vendors'] == []


def test_inventory_filter_matches_menu_items(client, seeded):
    response = client.get('/api/customer/search?item=Biriani&lat=0.0&lon=0.0')
    assert response.status_code == 200

    vendors = json.loads(response.data)['vendors']
    assert len(vendors) == 1
    assert vendors[0]['name'] == 'Pilau Palace'


def test_nearby_returns_open_vendors_within_radius(client, seeded):
    response = client.get('/api/customer/nearby?lat=0.0&lon=0.0&radius=5000')
    assert response.status_code == 200

    names = {v['name'] for v in json.loads(response.data)['vendors']}
    assert names == {'Samosa King', 'Pilau Palace'}


def test_search_missing_params(client):
    assert client.get('/api/customer/search').status_code == 400


def test_search_invalid_coords(client):
    assert client.get('/api/customer/search?item=Pilau&lat=invalid&lon=0.0').status_code == 400


# --------------------------------------------------------------------------
# Vendor check-in and role enforcement
# --------------------------------------------------------------------------

def test_checkin_requires_authentication(client, seeded):
    response = client.post('/api/vendor/checkin', json={'latitude': 0.0, 'longitude': 0.0})
    assert response.status_code == 401


def test_checkin_sets_three_hour_auto_close(client, seeded):
    token = _login(client, 'samosa@test.com')

    before = datetime.utcnow()
    response = client.post(
        '/api/vendor/checkin',
        headers={'Authorization': f'Bearer {token}'},
        json={
            'latitude': 0.0,
            'longitude': 0.0,
            'address': 'Test Street',
            'menu_items': [{'name': 'Samosa', 'desc': 'Crispy', 'price': 50}],
        },
    )
    after = datetime.utcnow()
    assert response.status_code == 200

    location = User.query.filter_by(email='samosa@test.com').first().location
    assert location.is_open is True
    assert before <= location.updated_at <= after
    assert location.auto_close_at - location.updated_at == timedelta(hours=3)


def test_checkin_rejects_non_vendor_roles(client, seeded):
    """A customer holding a valid JWT must not be able to list themselves as a vendor."""
    db.session.add(User(
        username='shopper',
        email='shopper@test.com',
        phone_number='+254700000123',
        password_hash=generate_password_hash('Customer123!'),
        role='customer',
    ))
    db.session.commit()

    token = _login(client, 'shopper@test.com', password='Customer123!')
    response = client.post(
        '/api/vendor/checkin',
        headers={'Authorization': f'Bearer {token}'},
        json={'latitude': 0.0, 'longitude': 0.0, 'menu_items': []},
    )
    assert response.status_code == 403


def test_upload_requires_authentication(client):
    """The Cloudinary upload endpoint must not be open to anonymous callers."""
    assert client.post('/api/vendor/upload').status_code == 401


# --------------------------------------------------------------------------
# Payments
# --------------------------------------------------------------------------

def test_payment_creates_order_and_pending_transaction(client, seeded, mock_stk):
    vendor = seeded['samosa']
    response = client.post('/api/customer/pay', json={
        'vendorId': vendor.id,
        'amount': 150,
        'phone': '+254711111111',
        'items': [{'name': 'Samosa', 'price': 50, 'qty': 3}],
        'deliveryLocation': 'Gate B',
        'customerLat': 0.0,
        'customerLon': 0.0,
    })
    assert response.status_code == 200, response.data

    body = json.loads(response.data)
    assert body['success'] is True
    assert body['order_number'].startswith('HL-')

    transaction = Transaction.query.filter_by(customer_phone='+254711111111').first()
    assert transaction.status == 'PENDING'
    assert transaction.amount == 150
    assert transaction.vendor_id == vendor.id
    assert transaction.checkout_request_id == 'ws_CO_TEST_123'

    assert Order.query.filter_by(id=transaction.order_id).first().status == 'Pending Payment'
    assert len(mock_stk) == 1


def test_payment_missing_fields(client):
    assert client.post('/api/customer/pay', json={'vendorId': 1}).status_code == 400


def test_callback_marks_transaction_and_order_paid(client, seeded, mock_stk):
    vendor = seeded['samosa']
    client.post('/api/customer/pay', json={
        'vendorId': vendor.id, 'amount': 150, 'phone': '+254711111111', 'items': [],
    })

    response = client.post('/api/customer/callback', json={
        'Body': {'stkCallback': {
            'CheckoutRequestID': 'ws_CO_TEST_123',
            'ResultCode': 0,
            'CallbackMetadata': {'Item': [{'Name': 'MpesaReceiptNumber', 'Value': 'QWE123XYZ'}]},
        }}
    })
    assert response.status_code == 200

    transaction = Transaction.query.filter_by(checkout_request_id='ws_CO_TEST_123').first()
    assert transaction.status == 'SUCCESSFUL'
    assert transaction.mpesa_receipt_number == 'QWE123XYZ'
    assert transaction.order.status == 'Paid'


def test_callback_marks_failure(client, seeded, mock_stk):
    vendor = seeded['samosa']
    client.post('/api/customer/pay', json={
        'vendorId': vendor.id, 'amount': 150, 'phone': '+254711111111', 'items': [],
    })

    response = client.post('/api/customer/callback', json={
        'Body': {'stkCallback': {
            'CheckoutRequestID': 'ws_CO_TEST_123',
            'ResultCode': 1032,
            'ResultDesc': 'Request cancelled by user',
        }}
    })
    assert response.status_code == 200

    transaction = Transaction.query.filter_by(checkout_request_id='ws_CO_TEST_123').first()
    assert transaction.status == 'FAILED'
    assert transaction.order.status == 'Payment Failed'


def test_payment_status_accepts_order_number(client, seeded, mock_stk):
    vendor = seeded['samosa']
    pay = client.post('/api/customer/pay', json={
        'vendorId': vendor.id, 'amount': 150, 'phone': '+254711111111', 'items': [],
    })
    order_number = json.loads(pay.data)['order_number']

    response = client.get(f'/api/customer/payment-status/{order_number}')
    assert response.status_code == 200
    assert json.loads(response.data)['status'] == 'PENDING'


def test_payment_status_unknown_identifier_reports_pending(client):
    """A read that races ahead of the write must not surface as a failure."""
    response = client.get('/api/customer/payment-status/HL-NOPE00')
    assert response.status_code == 200
    assert json.loads(response.data)['status'] == 'PENDING'


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------

def test_register_creates_user_and_returns_token(client):
    response = client.post('/api/auth/register', json={
        'username': 'newvendor',
        'email': 'new@test.com',
        'phone_number': '+254799999999',
        'password': 'pass123',
        'role': 'vendor',
        'business_name': 'New Stall',
    })
    assert response.status_code == 201

    body = json.loads(response.data)
    assert body['token']
    assert body['user']['role'] == 'vendor'


def test_register_rejects_missing_required_fields(client):
    response = client.post('/api/auth/register', json={
        'email': 'incomplete@test.com', 'password': 'pass123',
    })
    assert response.status_code == 400


def test_register_rejects_duplicate_email(client, seeded):
    response = client.post('/api/auth/register', json={
        'username': 'copycat',
        'email': 'samosa@test.com',
        'phone_number': '+254700000999',
        'password': 'pass123',
    })
    assert response.status_code == 409


def test_login_invalid_credentials(client):
    response = client.post('/api/auth/login', json={'email': 'wrong@test.com', 'password': 'wrong'})
    assert response.status_code == 401


def test_login_wrong_password_is_rejected(client, seeded):
    response = client.post('/api/auth/login', json={
        'email': 'samosa@test.com', 'password': 'not-the-password',
    })
    assert response.status_code == 401


# --------------------------------------------------------------------------
# Admin
# --------------------------------------------------------------------------

def test_admin_endpoints_reject_non_admin_token(client, seeded):
    token = _login(client, 'samosa@test.com')
    response = client.get('/api/admin/vendors', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 403


def test_admin_login_returns_role_claim(client):
    db.session.add(User(
        username='root',
        email='admin@test.com',
        phone_number='+254700000001',
        password_hash=generate_password_hash('admin123'),
        role='admin',
    ))
    db.session.commit()

    response = client.post('/api/admin/login', json={
        'email': 'admin@test.com', 'password': 'admin123',
    })
    assert response.status_code == 200

    token = json.loads(response.data)['token']
    vendors = client.get('/api/admin/vendors', headers={'Authorization': f'Bearer {token}'})
    assert vendors.status_code == 200


# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------

def test_cors_does_not_echo_arbitrary_origins(client):
    """
    With supports_credentials on, a wildcard/reflected origin would let any site
    the user visits call this API with their session.
    """
    response = client.get(
        '/api/customer/search?item=x&lat=0&lon=0',
        headers={'Origin': 'https://evil.example.com'},
    )
    allowed = response.headers.get('Access-Control-Allow-Origin')
    assert allowed != 'https://evil.example.com'
    assert allowed != '*'


def test_cors_allows_the_vite_dev_origin(client):
    response = client.get(
        '/api/customer/search?item=x&lat=0&lon=0',
        headers={'Origin': 'http://localhost:5173'},
    )
    assert response.headers.get('Access-Control-Allow-Origin') == 'http://localhost:5173'


# --------------------------------------------------------------------------
# Password reset
# --------------------------------------------------------------------------

def _request_reset(client, email='samosa@test.com'):
    response = client.post('/api/auth/forgot-password', json={'email': email})
    assert response.status_code == 200
    return User.query.filter_by(email=email).first().reset_token


def test_forgot_password_issues_a_token(client, seeded):
    token = _request_reset(client)
    assert token
    user = User.query.filter_by(email='samosa@test.com').first()
    assert user.reset_token_expiry > datetime.utcnow()


def test_forgot_password_does_not_leak_account_existence(client, seeded):
    known = client.post('/api/auth/forgot-password', json={'email': 'samosa@test.com'})
    unknown = client.post('/api/auth/forgot-password', json={'email': 'nobody@test.com'})
    assert known.status_code == unknown.status_code == 200
    assert json.loads(known.data) == json.loads(unknown.data)


def test_verify_reset_token_accepts_valid_and_rejects_bogus(client, seeded):
    token = _request_reset(client)
    assert client.get(f'/api/auth/reset-password/{token}').status_code == 200
    assert client.get('/api/auth/reset-password/not-a-real-token').status_code == 400


def test_reset_password_changes_the_password(client, seeded):
    token = _request_reset(client)

    response = client.post(f'/api/auth/reset-password/{token}',
                           json={'password': 'BrandNewPass1'})
    assert response.status_code == 200

    assert client.post('/api/auth/login', json={
        'email': 'samosa@test.com', 'password': 'Vendor123!',
    }).status_code == 401
    assert client.post('/api/auth/login', json={
        'email': 'samosa@test.com', 'password': 'BrandNewPass1',
    }).status_code == 200


def test_reset_token_is_single_use(client, seeded):
    token = _request_reset(client)
    assert client.post(f'/api/auth/reset-password/{token}',
                       json={'password': 'BrandNewPass1'}).status_code == 200
    assert client.post(f'/api/auth/reset-password/{token}',
                       json={'password': 'AnotherPass2'}).status_code == 400


def test_expired_reset_token_is_rejected(client, seeded):
    token = _request_reset(client)
    user = User.query.filter_by(email='samosa@test.com').first()
    user.reset_token_expiry = datetime.utcnow() - timedelta(minutes=1)
    db.session.commit()

    response = client.post(f'/api/auth/reset-password/{token}',
                           json={'password': 'BrandNewPass1'})
    assert response.status_code == 400
    assert 'expired' in json.loads(response.data)['error'].lower()


def test_reset_password_rejects_short_password(client, seeded):
    token = _request_reset(client)
    assert client.post(f'/api/auth/reset-password/{token}',
                       json={'password': 'abc'}).status_code == 400


def test_admin_logs_renders_transactions(client, seeded, mock_stk):
    """Regression: admin_routes reads t.vendor, which did not exist on Transaction."""
    vendor = seeded['samosa']
    client.post('/api/customer/pay', json={
        'vendorId': vendor.id, 'amount': 250, 'phone': '+254711111111', 'items': [],
    })

    db.session.add(User(
        username='root', email='admin@test.com', phone_number='+254700000001',
        password_hash=generate_password_hash('admin123'), role='admin',
    ))
    db.session.commit()

    token = json.loads(client.post('/api/admin/login', json={
        'email': 'admin@test.com', 'password': 'admin123',
    }).data)['token']

    response = client.get('/api/admin/logs', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200, response.data

    logs = json.loads(response.data)['logs']
    assert len(logs) == 1
    assert logs[0]['vendor_name'] == 'Samosa King'
    assert logs[0]['status'] == 'Failed'          # still PENDING -> not successful
    assert logs[0]['order_id'].startswith('HL-')


# --------------------------------------------------------------------------
# Vendor analytics
# --------------------------------------------------------------------------

def _paid_order(vendor, items, total, phone='+254711111111', hours_ago=1, status='Paid'):
    order = Order(
        order_number=Order.generate_order_number(),
        vendor_id=vendor.id,
        customer_phone=phone,
        total_amount=total,
        items=items,
        status=status,
        created_at=datetime.utcnow() - timedelta(hours=hours_ago),
    )
    db.session.add(order)
    db.session.flush()
    db.session.add(Transaction(
        vendor_id=vendor.id, order_id=order.id, customer_phone=phone, amount=total,
        checkout_request_id=f'ws_{order.order_number}',
        mpesa_receipt_number=f'R{order.order_number[-6:]}' if status == 'Paid' else None,
        status='SUCCESSFUL' if status == 'Paid' else 'FAILED',
        transaction_date=order.created_at,
    ))
    return order


def test_analytics_requires_vendor_role(client, seeded):
    assert client.get('/api/vendor/analytics').status_code == 401


def test_analytics_counts_only_paid_revenue(client, seeded):
    """Failed and pending orders must not inflate revenue."""
    vendor = seeded['samosa']
    _paid_order(vendor, [{'name': 'Samosa', 'price': 50, 'qty': 2}], 100)
    _paid_order(vendor, [{'name': 'Pilau', 'price': 150, 'qty': 1}], 150)
    _paid_order(vendor, [{'name': 'Pilau', 'price': 150, 'qty': 1}], 150,
                status='Payment Failed')
    _paid_order(vendor, [{'name': 'Pilau', 'price': 150, 'qty': 1}], 150,
                status='Pending Payment')
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    response = client.get('/api/vendor/analytics', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data['revenue']['total'] == 250        # 100 + 150 only
    assert data['orders']['paid'] == 2
    assert data['orders']['failed'] == 1
    assert data['orders']['pending'] == 1
    assert data['orders']['total'] == 4


def test_analytics_ranks_top_items_by_revenue(client, seeded):
    vendor = seeded['samosa']
    _paid_order(vendor, [{'name': 'Samosa', 'price': 50, 'qty': 4}], 200)
    _paid_order(vendor, [{'name': 'Pilau', 'price': 150, 'qty': 1},
                         {'name': 'Samosa', 'price': 50, 'qty': 1}], 200)
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    data = json.loads(client.get('/api/vendor/analytics',
                                 headers={'Authorization': f'Bearer {token}'}).data)

    top = data['top_items']
    assert top[0]['name'] == 'Samosa'
    assert top[0]['qty'] == 5
    assert top[0]['revenue'] == 250
    assert next(i for i in top if i['name'] == 'Pilau')['qty'] == 1


def test_analytics_isolates_vendors_from_each_other(client, seeded):
    """One vendor must never see another's revenue."""
    _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50)
    _paid_order(seeded['pilau'], [{'name': 'Pilau', 'price': 150, 'qty': 1}], 999)
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    data = json.loads(client.get('/api/vendor/analytics',
                                 headers={'Authorization': f'Bearer {token}'}).data)
    assert data['revenue']['total'] == 50


def test_analytics_reports_repeat_customers(client, seeded):
    vendor = seeded['samosa']
    _paid_order(vendor, [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50, phone='+254700000001')
    _paid_order(vendor, [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50, phone='+254700000001')
    _paid_order(vendor, [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50, phone='+254700000002')
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    data = json.loads(client.get('/api/vendor/analytics',
                                 headers={'Authorization': f'Bearer {token}'}).data)
    assert data['customers']['unique'] == 2
    assert data['customers']['repeat'] == 1


def test_analytics_handles_a_vendor_with_no_orders(client, seeded):
    """A brand-new vendor must get zeros, not a 500."""
    token = _login(client, 'fries@test.com')
    response = client.get('/api/vendor/analytics', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data['revenue']['total'] == 0
    assert data['orders']['total'] == 0
    assert data['top_items'] == []


# --------------------------------------------------------------------------
# Order lifecycle + customer history
# --------------------------------------------------------------------------

def _customer(email='shopper@test.com', phone='+254700000900'):
    user = User(username=email.split('@')[0], email=email, phone_number=phone,
                password_hash=generate_password_hash('Customer123!'), role='customer')
    db.session.add(user)
    db.session.commit()
    return user


def test_pay_attaches_customer_when_authenticated(client, seeded, mock_stk):
    user = _customer()
    token = _login(client, user.email, password='Customer123!')

    response = client.post('/api/customer/pay',
                           headers={'Authorization': f'Bearer {token}'},
                           json={'vendorId': seeded['samosa'].id, 'amount': 100,
                                 'phone': '+254711111111', 'items': []})
    assert response.status_code == 200
    assert Order.query.first().customer_id == user.id


def test_pay_still_works_for_guests(client, seeded, mock_stk):
    """Guest checkout must keep working - customer_id is nullable for exactly this."""
    response = client.post('/api/customer/pay',
                           json={'vendorId': seeded['samosa'].id, 'amount': 100,
                                 'phone': '+254711111111', 'items': []})
    assert response.status_code == 200
    assert Order.query.first().customer_id is None


def test_vendor_can_advance_status_through_the_timeline(client, seeded, mock_stk):
    vendor = seeded['samosa']
    order = _paid_order(vendor, [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50)
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    for target in ('Preparing', 'Ready', 'Collected'):
        r = client.patch(f'/api/vendor/order/{order.id}/status', headers=headers,
                         json={'status': target})
        assert r.status_code == 200, r.data
        assert json.loads(r.data)['order']['status'] == target


def test_vendor_cannot_skip_states(client, seeded, mock_stk):
    """Paid -> Collected would make the customer-facing timeline a lie."""
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50)
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    r = client.patch(f'/api/vendor/order/{order.id}/status',
                     headers={'Authorization': f'Bearer {token}'},
                     json={'status': 'Collected'})
    assert r.status_code == 409
    assert 'Preparing' in json.loads(r.data)['allowed']
    assert Order.query.get(order.id).status == 'Paid'


def test_vendor_cannot_touch_another_vendors_order(client, seeded, mock_stk):
    order = _paid_order(seeded['pilau'], [{'name': 'Pilau', 'price': 150, 'qty': 1}], 150)
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    r = client.patch(f'/api/vendor/order/{order.id}/status',
                     headers={'Authorization': f'Bearer {token}'},
                     json={'status': 'Preparing'})
    assert r.status_code == 404


def test_customer_sees_only_their_own_orders(client, seeded, mock_stk):
    mine = _customer('mine@test.com', '+254700000901')
    theirs = _customer('theirs@test.com', '+254700000902')

    for owner, amount in ((mine, 100), (theirs, 200)):
        o = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], amount)
        o.customer_id = owner.id
    db.session.commit()

    token = _login(client, 'mine@test.com', password='Customer123!')
    r = client.get('/api/customer/orders', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200

    orders = json.loads(r.data)['orders']
    assert len(orders) == 1
    assert orders[0]['total_amount'] == 100
    assert orders[0]['vendor']['name'] == 'Samosa King'


def test_order_detail_hides_other_peoples_orders(client, seeded, mock_stk):
    mine = _customer('mine@test.com', '+254700000901')
    theirs = _customer('theirs@test.com', '+254700000902')
    other = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 200)
    other.customer_id = theirs.id
    db.session.commit()

    token = _login(client, 'mine@test.com', password='Customer123!')
    r = client.get(f'/api/customer/orders/{other.order_number}',
                   headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 404          # not 403 - do not confirm it exists


def test_orders_require_authentication(client):
    assert client.get('/api/customer/orders').status_code == 401


# --------------------------------------------------------------------------
# Reviews
# --------------------------------------------------------------------------

def _collected_order(vendor, customer, total=200):
    order = _paid_order(vendor, [{'name': 'Samosa', 'price': 50, 'qty': 4}], total)
    order.customer_id = customer.id
    order.status = 'Collected'
    db.session.commit()
    return order


def test_review_requires_a_collected_order(client, seeded, mock_stk):
    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50)
    order.customer_id = customer.id
    db.session.commit()

    token = _login(client, customer.email, password='Customer123!')
    r = client.post(f'/api/customer/orders/{order.order_number}/review',
                    headers={'Authorization': f'Bearer {token}'}, json={'rating': 5})
    assert r.status_code == 409          # still 'Paid', not collected


def test_review_rejects_someone_elses_order(client, seeded, mock_stk):
    mine = _customer('mine@test.com', '+254700000901')
    theirs = _customer('theirs@test.com', '+254700000902')
    order = _collected_order(seeded['samosa'], theirs)

    token = _login(client, 'mine@test.com', password='Customer123!')
    r = client.post(f'/api/customer/orders/{order.order_number}/review',
                    headers={'Authorization': f'Bearer {token}'}, json={'rating': 5})
    assert r.status_code == 404


def test_review_is_accepted_once_and_only_once(client, seeded, mock_stk):
    customer = _customer()
    order = _collected_order(seeded['samosa'], customer)
    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}

    first = client.post(f'/api/customer/orders/{order.order_number}/review',
                        headers=headers, json={'rating': 4, 'comment': 'Great samosas'})
    assert first.status_code == 201
    assert json.loads(first.data)['vendor_rating'] == 4.0

    second = client.post(f'/api/customer/orders/{order.order_number}/review',
                         headers=headers, json={'rating': 1})
    assert second.status_code == 409


def test_review_validates_the_rating_range(client, seeded, mock_stk):
    customer = _customer()
    order = _collected_order(seeded['samosa'], customer)
    token = _login(client, customer.email, password='Customer123!')

    for bad in (0, 6, 'five', None):
        r = client.post(f'/api/customer/orders/{order.order_number}/review',
                        headers={'Authorization': f'Bearer {token}'}, json={'rating': bad})
        assert r.status_code == 400, f'rating={bad!r} should be rejected'


def test_vendor_rating_appears_in_discovery(client, seeded, mock_stk):
    customer = _customer()
    order = _collected_order(seeded['samosa'], customer)
    token = _login(client, customer.email, password='Customer123!')
    client.post(f'/api/customer/orders/{order.order_number}/review',
                headers={'Authorization': f'Bearer {token}'}, json={'rating': 5})

    data = json.loads(client.get('/api/customer/nearby?lat=0.0&lon=0.0&radius=5000').data)
    samosa = next(v for v in data['vendors'] if v['name'] == 'Samosa King')
    assert samosa['rating'] == 5.0
    assert samosa['rating_count'] == 1

    pilau = next(v for v in data['vendors'] if v['name'] == 'Pilau Palace')
    assert pilau['rating'] is None          # unrated, not zero


# --------------------------------------------------------------------------
# Favourites + go-live alerts
# --------------------------------------------------------------------------

def test_favourite_add_list_and_remove(client, seeded):
    customer = _customer()
    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}
    vendor_id = seeded['samosa'].id

    assert client.post(f'/api/customer/favourites/{vendor_id}', headers=headers).status_code == 201

    favs = json.loads(client.get('/api/customer/favourites', headers=headers).data)['favourites']
    assert len(favs) == 1
    assert favs[0]['name'] == 'Samosa King'
    assert favs[0]['is_live'] is True

    assert client.delete(f'/api/customer/favourites/{vendor_id}', headers=headers).status_code == 200
    assert json.loads(client.get('/api/customer/favourites', headers=headers).data)['favourites'] == []


def test_favouriting_twice_is_idempotent(client, seeded):
    customer = _customer()
    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}
    vendor_id = seeded['samosa'].id

    client.post(f'/api/customer/favourites/{vendor_id}', headers=headers)
    again = client.post(f'/api/customer/favourites/{vendor_id}', headers=headers)
    assert again.status_code == 200
    assert json.loads(again.data)['already'] is True


def test_favourites_require_authentication(client):
    assert client.get('/api/customer/favourites').status_code == 401


def test_expired_vendor_shows_as_not_live_in_favourites(client, seeded):
    customer = _customer()
    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}

    client.post(f'/api/customer/favourites/{seeded["stale"].id}', headers=headers)
    favs = json.loads(client.get('/api/customer/favourites', headers=headers).data)['favourites']
    assert favs[0]['is_live'] is False


def test_checkin_notifies_followers(client, seeded):
    customer = _customer()
    ctoken = _login(client, customer.email, password='Customer123!')
    client.post(f'/api/customer/favourites/{seeded["samosa"].id}',
                headers={'Authorization': f'Bearer {ctoken}'})

    vtoken = _login(client, 'samosa@test.com')
    r = client.post('/api/vendor/checkin', headers={'Authorization': f'Bearer {vtoken}'},
                    json={'latitude': 0.0, 'longitude': 0.0, 'address': 'Test St',
                          'menu_items': [{'name': 'Samosa', 'price': 50}]})
    assert r.status_code == 200
    assert json.loads(r.data)['followers_notified'] == 1


def test_checkin_survives_a_mail_failure(client, seeded, monkeypatch):
    """A broken mail server must never stop a vendor going live."""
    from app.extensions import mail

    customer = _customer()
    ctoken = _login(client, customer.email, password='Customer123!')
    client.post(f'/api/customer/favourites/{seeded["samosa"].id}',
                headers={'Authorization': f'Bearer {ctoken}'})

    def explode(*a, **k):
        raise RuntimeError('SMTP is down')
    monkeypatch.setattr(mail, 'send', explode)

    vtoken = _login(client, 'samosa@test.com')
    r = client.post('/api/vendor/checkin', headers={'Authorization': f'Bearer {vtoken}'},
                    json={'latitude': 0.0, 'longitude': 0.0, 'menu_items': []})
    assert r.status_code == 200
    assert json.loads(r.data)['followers_notified'] == 0


# --------------------------------------------------------------------------
# Profile / account
# --------------------------------------------------------------------------

def test_me_returns_the_caller(client, seeded):
    token = _login(client, 'samosa@test.com')
    r = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert json.loads(r.data)['user']['email'] == 'samosa@test.com'


def test_me_requires_authentication(client):
    assert client.get('/api/auth/me').status_code == 401


def test_update_me_changes_identity_fields(client, seeded):
    token = _login(client, 'samosa@test.com')
    r = client.put('/api/auth/me', headers={'Authorization': f'Bearer {token}'},
                   json={'username': 'renamed', 'phone_number': '+254700009999'})
    assert r.status_code == 200

    user = User.query.filter_by(email='samosa@test.com').first()
    assert user.username == 'renamed'
    assert user.phone_number == '+254700009999'


def test_update_me_rejects_a_taken_email(client, seeded):
    token = _login(client, 'samosa@test.com')
    r = client.put('/api/auth/me', headers={'Authorization': f'Bearer {token}'},
                   json={'email': 'pilau@test.com'})
    assert r.status_code == 409
    # the clash must not have been half-applied
    assert User.query.filter_by(email='samosa@test.com').first() is not None


def test_change_password_requires_the_current_one(client, seeded):
    token = _login(client, 'samosa@test.com')
    headers = {'Authorization': f'Bearer {token}'}

    wrong = client.post('/api/auth/change-password', headers=headers,
                        json={'current_password': 'nope', 'new_password': 'BrandNew123'})
    assert wrong.status_code == 401

    ok = client.post('/api/auth/change-password', headers=headers,
                     json={'current_password': 'Vendor123!', 'new_password': 'BrandNew123'})
    assert ok.status_code == 200

    assert client.post('/api/auth/login', json={
        'email': 'samosa@test.com', 'password': 'BrandNew123'}).status_code == 200


def test_vendor_profile_no_longer_silently_drops_password(client, seeded):
    """It used to accept password/username, ignore them, and report success."""
    token = _login(client, 'samosa@test.com')
    r = client.put('/api/vendor/profile', headers={'Authorization': f'Bearer {token}'},
                   json={'business_name': 'Renamed', 'password': 'hunter2'})
    assert r.status_code == 400
    assert 'auth/me' in json.loads(r.data)['error']
    # and the legitimate field must not have been applied either
    assert User.query.filter_by(email='samosa@test.com').first().business_name == 'Samosa King'


# --------------------------------------------------------------------------
# Saved addresses
# --------------------------------------------------------------------------

def test_first_address_becomes_the_default(client, seeded):
    customer = _customer()
    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}

    r = client.post('/api/customer/addresses', headers=headers,
                    json={'label': 'Home', 'details': 'Gate B, blue door'})
    assert r.status_code == 201
    assert json.loads(r.data)['address']['is_default'] is True


def test_only_one_address_is_ever_default(client, seeded):
    customer = _customer()
    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}

    client.post('/api/customer/addresses', headers=headers,
                json={'label': 'Home', 'details': 'Gate B'})
    client.post('/api/customer/addresses', headers=headers,
                json={'label': 'Work', 'details': 'Reception', 'is_default': True})

    addresses = json.loads(client.get('/api/customer/addresses', headers=headers).data)['addresses']
    assert sum(1 for a in addresses if a['is_default']) == 1
    assert next(a for a in addresses if a['is_default'])['label'] == 'Work'


def test_deleting_the_default_promotes_another(client, seeded):
    customer = _customer()
    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}

    first = json.loads(client.post('/api/customer/addresses', headers=headers,
                                   json={'label': 'Home', 'details': 'Gate B'}).data)['address']
    client.post('/api/customer/addresses', headers=headers,
                json={'label': 'Work', 'details': 'Reception'})

    client.delete(f"/api/customer/addresses/{first['id']}", headers=headers)
    addresses = json.loads(client.get('/api/customer/addresses', headers=headers).data)['addresses']
    assert len(addresses) == 1
    assert addresses[0]['is_default'] is True


def test_addresses_are_private_to_their_owner(client, seeded):
    mine = _customer('mine@test.com', '+254700000901')
    theirs = _customer('theirs@test.com', '+254700000902')

    their_token = _login(client, 'theirs@test.com', password='Customer123!')
    created = json.loads(client.post('/api/customer/addresses',
                                     headers={'Authorization': f'Bearer {their_token}'},
                                     json={'label': 'Home', 'details': 'Secret'}).data)['address']

    my_token = _login(client, 'mine@test.com', password='Customer123!')
    r = client.delete(f"/api/customer/addresses/{created['id']}",
                      headers={'Authorization': f'Bearer {my_token}'})
    assert r.status_code == 404


# --------------------------------------------------------------------------
# Promotions
# --------------------------------------------------------------------------

def _promo(client, vendor_email='samosa@test.com', **kwargs):
    token = _login(client, vendor_email)
    payload = {'code': 'LUNCH10', 'percent_off': 10}
    payload.update(kwargs)
    r = client.post('/api/vendor/promotions',
                    headers={'Authorization': f'Bearer {token}'}, json=payload)
    return r


def test_promotion_discount_is_capped(client, seeded):
    assert _promo(client, percent_off=100).status_code == 400
    assert _promo(client, percent_off=0).status_code == 400
    assert _promo(client, percent_off=70).status_code == 201


def test_promo_codes_are_unique_per_vendor_not_globally(client, seeded):
    assert _promo(client, code='LUNCH10').status_code == 201
    assert _promo(client, code='LUNCH10').status_code == 409          # same vendor
    assert _promo(client, vendor_email='pilau@test.com',
                  code='LUNCH10').status_code == 201                  # different vendor


def test_promo_preview_matches_what_checkout_charges(client, seeded, mock_stk):
    _promo(client, code='SAVE20', percent_off=20)
    vendor_id = seeded['samosa'].id

    preview = client.post('/api/customer/promo/preview',
                          json={'code': 'SAVE20', 'vendorId': vendor_id, 'subtotal': 500})
    assert preview.status_code == 200
    quoted = json.loads(preview.data)
    assert quoted['discount'] == 100.0
    assert quoted['total'] == 400.0

    pay = client.post('/api/customer/pay', json={
        'vendorId': vendor_id, 'amount': 500, 'phone': '+254711111111',
        'items': [], 'promoCode': 'SAVE20'})
    assert pay.status_code == 200

    order = Order.query.first()
    assert order.total_amount == quoted['total']
    assert order.discount_amount == 100.0
    assert order.promo_code == 'SAVE20'


def test_promo_below_minimum_spend_is_refused(client, seeded):
    _promo(client, code='BIG', percent_off=15, min_order=1000)
    r = client.post('/api/customer/promo/preview',
                    json={'code': 'BIG', 'vendorId': seeded['samosa'].id, 'subtotal': 200})
    assert r.status_code == 409
    assert 'at least' in json.loads(r.data)['error'].lower()


def test_promo_from_another_vendor_is_refused(client, seeded):
    _promo(client, vendor_email='pilau@test.com', code='PILAUONLY', percent_off=10)
    r = client.post('/api/customer/promo/preview',
                    json={'code': 'PILAUONLY', 'vendorId': seeded['samosa'].id, 'subtotal': 500})
    assert r.status_code == 404


def test_redemption_counts_only_after_payment_succeeds(client, seeded, mock_stk):
    _promo(client, code='ONCE', percent_off=10, max_redemptions=1)
    vendor_id = seeded['samosa'].id

    pay = client.post('/api/customer/pay', json={
        'vendorId': vendor_id, 'amount': 500, 'phone': '+254711111111',
        'items': [], 'promoCode': 'ONCE'})
    assert pay.status_code == 200

    promo = Promotion.query.filter_by(code='ONCE').first()
    assert promo.times_redeemed == 0, 'an unpaid order must not burn a redemption'

    client.post('/api/customer/callback', json={'Body': {'stkCallback': {
        'CheckoutRequestID': 'ws_CO_TEST_123', 'ResultCode': 0,
        'CallbackMetadata': {'Item': [{'Name': 'MpesaReceiptNumber', 'Value': 'RCPT1'}]}}}})

    assert Promotion.query.filter_by(code='ONCE').first().times_redeemed == 1


# --------------------------------------------------------------------------
# Reorder + cancel + filters + notes
# --------------------------------------------------------------------------

def test_reorder_reports_items_no_longer_on_the_menu(client, seeded, mock_stk):
    customer = _customer()
    order = _paid_order(seeded['samosa'],
                        [{'name': 'Samosa', 'price': 50, 'qty': 2},
                         {'name': 'Discontinued Dish', 'price': 99, 'qty': 1}], 199)
    order.customer_id = customer.id
    db.session.commit()

    token = _login(client, customer.email, password='Customer123!')
    r = client.post(f'/api/customer/orders/{order.order_number}/reorder',
                    headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200

    body = json.loads(r.data)
    assert [i['name'] for i in body['items']] == ['Samosa']
    assert body['unavailable'] == ['Discontinued Dish']
    assert body['vendor']['is_live'] is True


def test_customer_can_cancel_before_preparing_but_not_after(client, seeded, mock_stk):
    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50)
    order.customer_id = customer.id
    db.session.commit()

    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}

    order.status = 'Preparing'
    db.session.commit()
    late = client.post(f'/api/customer/orders/{order.order_number}/cancel', headers=headers)
    assert late.status_code == 409

    order.status = 'Paid'
    db.session.commit()
    early = client.post(f'/api/customer/orders/{order.order_number}/cancel', headers=headers)
    assert early.status_code == 200
    assert Order.query.get(order.id).status == 'Cancelled'


def test_nearby_filters_by_rating_and_sorts(client, seeded, mock_stk):
    customer = _customer()
    order = _collected_order(seeded['pilau'], customer)
    token = _login(client, customer.email, password='Customer123!')
    client.post(f'/api/customer/orders/{order.order_number}/review',
                headers={'Authorization': f'Bearer {token}'}, json={'rating': 5})

    filtered = json.loads(client.get(
        '/api/customer/nearby?lat=0.0&lon=0.0&radius=5000&min_rating=4').data)['vendors']
    assert [v['name'] for v in filtered] == ['Pilau Palace']

    by_rating = json.loads(client.get(
        '/api/customer/nearby?lat=0.0&lon=0.0&radius=5000&sort=rating').data)['vendors']
    assert by_rating[0]['name'] == 'Pilau Palace'      # rated first, unrated after


def test_nearby_price_filter_uses_the_cheapest_item(client, seeded):
    """'Can I eat for 60?' must not exclude a stall over one expensive dish."""
    cheap = json.loads(client.get(
        '/api/customer/nearby?lat=0.0&lon=0.0&radius=5000&max_price=60').data)['vendors']
    assert 'Samosa King' in [v['name'] for v in cheap]      # cheapest item is 50

    dear = json.loads(client.get(
        '/api/customer/nearby?lat=0.0&lon=0.0&radius=5000&max_price=10').data)['vendors']
    assert dear == []


def test_item_notes_are_stored_and_trimmed(client, seeded, mock_stk):
    client.post('/api/customer/pay', json={
        'vendorId': seeded['samosa'].id, 'amount': 100, 'phone': '+254711111111',
        'items': [{'name': 'Samosa', 'price': 50, 'qty': 2, 'note': 'x' * 400}]})

    stored = Order.query.first().items[0]
    assert len(stored['note']) == 140


# --------------------------------------------------------------------------
# Closing shop with unfulfilled orders
# --------------------------------------------------------------------------

def test_close_is_refused_while_orders_are_outstanding(client, seeded, mock_stk):
    """Money has been taken; closing must not silently strand the customer."""
    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 340)
    order.customer_id = customer.id
    order.status = 'Preparing'
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    r = client.post('/api/vendor/close', headers={'Authorization': f'Bearer {token}'}, json={})
    assert r.status_code == 409

    body = json.loads(r.data)
    assert body['outstanding'] == 1
    assert body['orders'][0]['order_number'] == order.order_number
    # and the vendor must still be open until they decide
    assert seeded['samosa'].location.is_open is True


def test_close_succeeds_with_no_outstanding_orders(client, seeded, mock_stk):
    _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50,
                status='Collected')
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    r = client.post('/api/vendor/close', headers={'Authorization': f'Bearer {token}'}, json={})
    assert r.status_code == 200
    assert seeded['samosa'].location.is_open is False


def test_forced_close_notifies_the_stranded_customers(client, seeded, mock_stk):
    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 340)
    order.customer_id = customer.id
    order.status = 'Preparing'
    db.session.commit()

    token = _login(client, 'samosa@test.com')
    r = client.post('/api/vendor/close', headers={'Authorization': f'Bearer {token}'},
                    json={'force': True})
    assert r.status_code == 200

    body = json.loads(r.data)
    assert body['customers_notified'] == 1
    assert seeded['samosa'].location.is_open is False


def test_forced_close_survives_a_mail_failure(client, seeded, mock_stk, monkeypatch):
    from app.extensions import mail

    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 340)
    order.customer_id = customer.id
    db.session.commit()

    monkeypatch.setattr(mail, 'send', lambda *a, **k: (_ for _ in ()).throw(RuntimeError('smtp down')))

    token = _login(client, 'samosa@test.com')
    r = client.post('/api/vendor/close', headers={'Authorization': f'Bearer {token}'},
                    json={'force': True})
    assert r.status_code == 200          # closing must not depend on email
    assert seeded['samosa'].location.is_open is False


def test_customer_order_shows_whether_the_vendor_is_still_live(client, seeded, mock_stk):
    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 340)
    order.customer_id = customer.id
    db.session.commit()

    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}

    live = json.loads(client.get('/api/customer/orders', headers=headers).data)['orders'][0]
    assert live['vendor']['is_live'] is True

    seeded['samosa'].location.is_open = False
    seeded['samosa'].location.auto_close_at = datetime.utcnow() - timedelta(minutes=1)
    db.session.commit()

    closed = json.loads(client.get('/api/customer/orders', headers=headers).data)['orders'][0]
    assert closed['vendor']['is_live'] is False


def test_customer_can_cancel_a_stranded_order_after_the_vendor_closes(client, seeded, mock_stk):
    """Normally Preparing cannot be cancelled - but an abandoned order needs an exit."""
    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 340)
    order.customer_id = customer.id
    order.status = 'Preparing'
    db.session.commit()

    token = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {token}'}

    blocked = client.post(f'/api/customer/orders/{order.order_number}/cancel', headers=headers)
    assert blocked.status_code == 409           # vendor still open, still cooking

    seeded['samosa'].location.is_open = False
    seeded['samosa'].location.auto_close_at = datetime.utcnow() - timedelta(minutes=1)
    db.session.commit()

    allowed = client.post(f'/api/customer/orders/{order.order_number}/cancel', headers=headers)
    assert allowed.status_code == 200
    assert Order.query.get(order.id).status == 'Cancelled'


# --------------------------------------------------------------------------
# Notifications
# --------------------------------------------------------------------------

def test_notifications_require_authentication(client):
    assert client.get('/api/customer/notifications').status_code == 401


def test_going_live_notifies_followers_in_app(client, seeded):
    customer = _customer()
    ctoken = _login(client, customer.email, password='Customer123!')
    client.post(f'/api/customer/favourites/{seeded["samosa"].id}',
                headers={'Authorization': f'Bearer {ctoken}'})

    vtoken = _login(client, 'samosa@test.com')
    client.post('/api/vendor/checkin', headers={'Authorization': f'Bearer {vtoken}'},
                json={'latitude': 0.0, 'longitude': 0.0, 'address': 'Test St', 'menu_items': []})

    data = json.loads(client.get('/api/customer/notifications',
                                 headers={'Authorization': f'Bearer {ctoken}'}).data)
    assert data['unread'] == 1
    assert data['notifications'][0]['kind'] == 'vendor_live'
    assert 'Samosa King' in data['notifications'][0]['title']


def test_status_change_notifies_the_customer(client, seeded, mock_stk):
    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50)
    order.customer_id = customer.id
    db.session.commit()

    vtoken = _login(client, 'samosa@test.com')
    client.patch(f'/api/vendor/order/{order.id}/status',
                 headers={'Authorization': f'Bearer {vtoken}'}, json={'status': 'Preparing'})

    ctoken = _login(client, customer.email, password='Customer123!')
    data = json.loads(client.get('/api/customer/notifications',
                                 headers={'Authorization': f'Bearer {ctoken}'}).data)
    assert data['unread'] == 1
    assert data['notifications'][0]['kind'] == 'order_status'
    assert order.order_number in data['notifications'][0]['body']


def test_paid_callback_notifies_the_vendor(client, seeded, mock_stk):
    client.post('/api/customer/pay', json={
        'vendorId': seeded['samosa'].id, 'amount': 250,
        'phone': '+254711111111', 'items': []})
    client.post('/api/customer/callback', json={'Body': {'stkCallback': {
        'CheckoutRequestID': 'ws_CO_TEST_123', 'ResultCode': 0,
        'CallbackMetadata': {'Item': [{'Name': 'MpesaReceiptNumber', 'Value': 'RC1'}]}}}})

    vtoken = _login(client, 'samosa@test.com')
    data = json.loads(client.get('/api/customer/notifications',
                                 headers={'Authorization': f'Bearer {vtoken}'}).data)
    assert data['unread'] == 1
    assert data['notifications'][0]['kind'] == 'new_order'


def test_notifications_are_private_to_their_owner(client, seeded, mock_stk):
    mine = _customer('mine@test.com', '+254700000901')
    theirs = _customer('theirs@test.com', '+254700000902')

    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50)
    order.customer_id = theirs.id
    db.session.commit()

    vtoken = _login(client, 'samosa@test.com')
    client.patch(f'/api/vendor/order/{order.id}/status',
                 headers={'Authorization': f'Bearer {vtoken}'}, json={'status': 'Preparing'})

    my_token = _login(client, 'mine@test.com', password='Customer123!')
    data = json.loads(client.get('/api/customer/notifications',
                                 headers={'Authorization': f'Bearer {my_token}'}).data)
    assert data['unread'] == 0
    assert data['notifications'] == []


def test_marking_read_clears_the_unread_count(client, seeded, mock_stk):
    customer = _customer()
    order = _paid_order(seeded['samosa'], [{'name': 'Samosa', 'price': 50, 'qty': 1}], 50)
    order.customer_id = customer.id
    db.session.commit()

    vtoken = _login(client, 'samosa@test.com')
    for target in ('Preparing', 'Ready'):
        client.patch(f'/api/vendor/order/{order.id}/status',
                     headers={'Authorization': f'Bearer {vtoken}'}, json={'status': target})

    ctoken = _login(client, customer.email, password='Customer123!')
    headers = {'Authorization': f'Bearer {ctoken}'}
    assert json.loads(client.get('/api/customer/notifications', headers=headers).data)['unread'] == 2

    assert client.post('/api/customer/notifications/read-all', headers=headers).status_code == 200
    assert json.loads(client.get('/api/customer/notifications', headers=headers).data)['unread'] == 0


def test_checkin_still_succeeds_if_notifications_fail(client, seeded, monkeypatch):
    """The bell must never be able to stop a vendor going live."""
    import app.utils.notifications as notif
    monkeypatch.setattr(notif, 'push_many',
                        lambda *a, **k: (_ for _ in ()).throw(RuntimeError('db gone')))

    customer = _customer()
    ctoken = _login(client, customer.email, password='Customer123!')
    client.post(f'/api/customer/favourites/{seeded["samosa"].id}',
                headers={'Authorization': f'Bearer {ctoken}'})

    vtoken = _login(client, 'samosa@test.com')
    r = client.post('/api/vendor/checkin', headers={'Authorization': f'Bearer {vtoken}'},
                    json={'latitude': 0.0, 'longitude': 0.0, 'menu_items': []})
    assert r.status_code == 200
