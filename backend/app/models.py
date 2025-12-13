from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import CheckConstraint

# 1. USER TABLE (handles auth for Vendors and Admins)
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    phone_number = db.Column(db.String(15), unique=True, nullable=False)  # For M-Pesa
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(10), nullable=False)  # 'vendor' or 'admin'

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship: A User (Vendor) has one active location
    location = db.relationship('VendorLocation', backref='vendor', uselist=False)

    # Relationship: A User (Vendor) has multiple transactions
    transactions = db.relationship('Transaction', backref='vendor', foreign_keys='Transaction.vendor_id')

    __table_args__ = (
        CheckConstraint("role IN ('vendor', 'admin')", name='check_user_role'),
    )


# 2. VENDOR LOCATION (The "Check-In" Data)
class VendorLocation(db.Model):
    __tablename__ = 'vendor_locations'
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    menu_items = db.Column(JSON, nullable=False)  # {"items": [...], "prices": {...}}

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# 3. TRANSACTION (For the M-Pesa Logs)
class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Vendor getting paid
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Customer info (only phone number)
    customer_phone = db.Column(db.String(15), nullable=False)
    
    amount = db.Column(db.Float, nullable=False)
    mpesa_receipt_number = db.Column(db.String(20), unique=True, nullable=True)
    status = db.Column(db.String(20), default='PENDING')  # PENDING, COMPLETED, FAILED

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
