from app.extensions import db
from datetime import datetime, timedelta
import random
import string

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    
    # MVP 2: Phone/Password nullable for Google Users
    phone_number = db.Column(db.String(20), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=True)
    
    role = db.Column(db.String(20), default='customer') # 'admin', 'vendor', 'customer'
    
    # Vendor Specific
    business_name = db.Column(db.String(100), nullable=True)
    storefront_image_url = db.Column(db.String(500), nullable=True)
    
    # --- MVP 2: AUTH & SECURITY ---
    google_id = db.Column(db.String(100), unique=True, nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    
    # Password Recovery
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    location = db.relationship('VendorLocation', backref='vendor', uselist=False, cascade="all, delete-orphan")
    orders = db.relationship('Order', backref='vendor', lazy=True,
                             foreign_keys='Order.vendor_id')
    purchases = db.relationship('Order', lazy=True,
                                foreign_keys='Order.customer_id',
                                back_populates='customer')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'business_name': self.business_name,
            'image': self.storefront_image_url,
            'is_verified': self.is_verified
        }

class VendorLocation(db.Model):
    __tablename__ = 'vendor_locations'

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(200), nullable=True)
    
    # MVP 2: Store menu as JSON instead of separate table
    menu_items = db.Column(db.JSON, nullable=True)
    
    is_open = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    auto_close_at = db.Column(db.DateTime, nullable=True)

    def check_in(self, duration_hours=3):
        # Read the clock once: two utcnow() calls drift by microseconds, which makes
        # the freshness window not exactly duration_hours.
        now = datetime.utcnow()
        self.is_open = True
        self.updated_at = now
        self.auto_close_at = now + timedelta(hours=duration_hours)

class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True, nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    customer_phone = db.Column(db.String(20), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Pending Payment')
    
    items = db.Column(db.JSON, nullable=False)
    delivery_location = db.Column(db.String(200), nullable=True)
    
    customer_latitude = db.Column(db.Float, nullable=True)
    customer_longitude = db.Column(db.Float, nullable=True)

    # What was actually charged vs the menu price, so receipts and analytics agree.
    promo_code = db.Column(db.String(24), nullable=True)
    discount_amount = db.Column(db.Float, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    transaction = db.relationship('Transaction', backref='order', uselist=False)
    customer = db.relationship('User', foreign_keys=[customer_id],
                               back_populates='purchases')

    @staticmethod
    def generate_order_number():
        return 'HL-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

class Transaction(db.Model):
    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    
    customer_phone = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    
    checkout_request_id = db.Column(db.String(100), unique=True, nullable=True)
    mpesa_receipt_number = db.Column(db.String(50), unique=True, nullable=True)
    
    status = db.Column(db.String(20), default='PENDING')
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)

    # admin_routes reads t.vendor to label each log line. Without this relationship
    # /api/admin/logs raises AttributeError and 500s as soon as any transaction exists.
    vendor = db.relationship('User', foreign_keys=[vendor_id])

class Favourite(db.Model):
    """
    A customer following a vendor, so they can be told when that vendor next goes
    live. The unique constraint makes a double-follow impossible at the database
    level rather than relying on the route to check first.
    """
    __tablename__ = 'favourites'
    __table_args__ = (
        db.UniqueConstraint('customer_id', 'vendor_id', name='uq_favourite_customer_vendor'),
    )

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    customer = db.relationship('User', foreign_keys=[customer_id])
    vendor = db.relationship('User', foreign_keys=[vendor_id])


class Review(db.Model):
    """
    A rating tied to one specific order.

    order_id is unique, and the route only accepts a review for a Collected order
    that the caller actually paid for. That pairing is what makes ratings here
    mean something - they cannot be manufactured without a real transaction.
    """
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    rating = db.Column(db.Integer, nullable=False)   # 1-5, enforced in the route
    comment = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order = db.relationship('Order', foreign_keys=[order_id])
    customer = db.relationship('User', foreign_keys=[customer_id])
    vendor = db.relationship('User', foreign_keys=[vendor_id])


class Address(db.Model):
    """
    A saved delivery address, so customers stop retyping "Gate B, main entrance"
    on every order. Coordinates are stored alongside the text because the vendor
    routes to the pin, not the label.
    """
    __tablename__ = 'addresses'

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    label = db.Column(db.String(40), nullable=False)        # Home / Work / Gym...
    details = db.Column(db.String(200), nullable=False)     # what the vendor reads
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    customer = db.relationship('User', foreign_keys=[customer_id])

    def to_dict(self):
        return {
            'id': self.id, 'label': self.label, 'details': self.details,
            'latitude': self.latitude, 'longitude': self.longitude,
            'is_default': bool(self.is_default),
        }


class Promotion(db.Model):
    """
    A vendor-created discount code.

    `code` is stored uppercased and is unique per vendor, not globally - two
    different stalls can both run "LUNCH10" without colliding. Redemption is capped
    by max_redemptions and bounded by expires_at.
    """
    __tablename__ = 'promotions'
    __table_args__ = (
        db.UniqueConstraint('vendor_id', 'code', name='uq_promotion_vendor_code'),
    )

    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    code = db.Column(db.String(24), nullable=False)
    percent_off = db.Column(db.Integer, nullable=False)     # 1-70, enforced in the route
    min_order = db.Column(db.Float, default=0)
    max_redemptions = db.Column(db.Integer, nullable=True)  # null = unlimited
    times_redeemed = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    vendor = db.relationship('User', foreign_keys=[vendor_id])

    def usable(self, now=None, subtotal=0):
        """(ok, reason). One place decides validity so checkout and preview agree."""
        now = now or datetime.utcnow()
        if not self.is_active:
            return False, 'This code is no longer active.'
        if self.expires_at and self.expires_at < now:
            return False, 'This code has expired.'
        if self.max_redemptions is not None and self.times_redeemed >= self.max_redemptions:
            return False, 'This code has been fully redeemed.'
        if subtotal < (self.min_order or 0):
            return False, f'Spend at least KES {int(self.min_order)} to use this code.'
        return True, None

    def discount_for(self, subtotal):
        return round(subtotal * (self.percent_off / 100.0), 2)

    def to_dict(self):
        return {
            'id': self.id, 'code': self.code, 'percent_off': self.percent_off,
            'min_order': self.min_order, 'max_redemptions': self.max_redemptions,
            'times_redeemed': self.times_redeemed,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': bool(self.is_active),
        }


class Notification(db.Model):
    """
    In-app alerts for both roles.

    Email alone is not enough: a vendor cooking over charcoal is not reading their
    inbox, and a customer wants the update where they placed the order. Every event
    that sends mail also lands here, so the bell is the durable record and email is
    the nudge.
    """
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    kind = db.Column(db.String(32), nullable=False)   # order_status | vendor_live | vendor_closed | new_order
    title = db.Column(db.String(120), nullable=False)
    body = db.Column(db.String(300), nullable=True)
    link = db.Column(db.String(200), nullable=True)   # where tapping it should go

    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'kind': self.kind,
            'title': self.title,
            'body': self.body,
            'link': self.link,
            'is_read': bool(self.is_read),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
