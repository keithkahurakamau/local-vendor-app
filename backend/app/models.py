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
    orders = db.relationship('Order', backref='vendor', lazy=True)

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
        self.is_open = True
        self.updated_at = datetime.utcnow()
        self.auto_close_at = datetime.utcnow() + timedelta(hours=duration_hours)

class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True, nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    customer_phone = db.Column(db.String(20), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Pending Payment')
    
    items = db.Column(db.JSON, nullable=False)
    delivery_location = db.Column(db.String(200), nullable=True)
    
    customer_latitude = db.Column(db.Float, nullable=True)
    customer_longitude = db.Column(db.Float, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    transaction = db.relationship('Transaction', backref='order', uselist=False)

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