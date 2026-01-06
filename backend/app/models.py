from app.extensions import db
from datetime import datetime, timedelta
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import CheckConstraint, Index

# ============================================================================
# 1. USER TABLE - Authentication & Roles (Auth-2, Auth-4)
# ============================================================================
class User(db.Model):
    """
    Handles authentication for Vendors and Admins.
    Satisfies Requirement: Auth-2, Auth-4 
    """
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    phone_number = db.Column(db.String(15), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # RBAC Role: 'vendor' or 'admin' 
    role = db.Column(db.String(10), nullable=False)  

    # Vendor Profile Data
    business_name = db.Column(db.String(100))
    owner_name = db.Column(db.String(100))
    
    # Cloudinary Storefront Image
    storefront_image_url = db.Column(db.String(500))
    storefront_image_public_id = db.Column(db.String(255))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    # One-to-One: Vendor has one active location state
    location = db.relationship('VendorLocation', backref='vendor', uselist=False, cascade='all, delete-orphan')
    # One-to-Many: Vendor has many orders and transactions
    orders = db.relationship('Order', backref='vendor', lazy='dynamic')
    transactions = db.relationship('Transaction', backref='vendor', lazy='dynamic')

    __table_args__ = (
        CheckConstraint("role IN ('vendor', 'admin')", name='check_user_role'),
    )

    def __repr__(self):
        return f'<User {self.username} ({self.role})>'


# ============================================================================
# 2. VENDOR LOCATION - The Core "Finder" Data (B-R1, B-R3, B-R4, B-R5)
# ============================================================================
class VendorLocation(db.Model):
    """
    Stores real-time location and menu snapshot for search.
    Satisfies Requirements: 
    - B-R1: Geo-Tagging Endpoint 
    - B-R3: Proximity Filtering (via lat/lon) 
    - B-R4: Inventory Filtering (via menu_items JSON) 
    - B-R5: Real-Time Freshness Check (via auto_close_at) 
    """
    __tablename__ = 'vendor_locations'
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)

    # GPS Coordinates (Float required for Haversine calc) 
    latitude = db.Column(db.Float, nullable=False, index=True)
    longitude = db.Column(db.Float, nullable=False, index=True)
    address = db.Column(db.String(255)) 

    # B-R4: Inventory Filtering - Stores menu snapshot for search 
    # Structure: [{"name": "Samosa", "price": 50, "available": true}, ...]
    menu_items = db.Column(JSON, nullable=False) 

    # B-R5: Real-Time Freshness Logic 
    is_open = db.Column(db.Boolean, default=False, index=True)
    last_checkin = db.Column(db.DateTime)      
    auto_close_at = db.Column(db.DateTime)     # 3 hours from check-in

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        # Composite index for fast geospatial + status queries
        Index('idx_location_search', 'latitude', 'longitude', 'is_open'),
    )

    def check_in(self):
        """Activates vendor for 3 hours (B-R5)"""
        self.is_open = True
        self.last_checkin = datetime.utcnow()
        self.auto_close_at = datetime.utcnow() + timedelta(hours=3)
        self.updated_at = datetime.utcnow()

    def should_auto_close(self):
        """Returns True if the 3-hour window has passed (B-R5)"""
        if self.auto_close_at and datetime.utcnow() >= self.auto_close_at:
            return True
        return False


# ============================================================================
# 3. ORDER - Order Management (Linked to F-R4 "Pay & Order")
# ============================================================================
class Order(db.Model):
    """
    Links the Customer, Vendor, and Transaction.
    Required for: 'Pay & Order' functionality [cite: 673]
    """
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True, nullable=False)  # e.g., "ORD-001"

    # Relationships
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Store customer phone directly as per Auth-5 (Simple identification) 
    customer_phone = db.Column(db.String(15), nullable=False, index=True)

    # Order Details
    items = db.Column(JSON, nullable=False) # Snapshot of what was ordered
    total_amount = db.Column(db.Float, nullable=False)
    
    # Status
    status = db.Column(db.String(20), default='New Order') 
    # 'New Order', 'Paid', 'Completed', 'Cancelled'

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Link to the payment
    transaction = db.relationship('Transaction', backref='order', uselist=False)

    @staticmethod
    def generate_order_number():
        last_order = Order.query.order_by(Order.id.desc()).first()
        if last_order:
            try:
                last_num = int(last_order.order_number.split('-')[1])
                return f"ORD-{str(last_num + 1).zfill(3)}"
            except:
                return "ORD-001"
        return "ORD-001"


# ============================================================================
# 4. TRANSACTION - M-Pesa Logs (B-R6, B-R7, AD-02)
# ============================================================================
class Transaction(db.Model):
    """
    Logs all M-Pesa payments.
    Satisfies Requirements:
    - B-R6: Instant Payment Trigger 
    - B-R7: Payment Callback Logging 
    - AD-02: Admin Transaction Monitoring 
    """
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Link to Vendor and Order
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=True)
    
    # Payment Details
    customer_phone = db.Column(db.String(15), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    
    # M-Pesa Data (Populated by Callback B-R7)
    mpesa_receipt_number = db.Column(db.String(20), unique=True, nullable=True)
    transaction_date = db.Column(db.DateTime)
    
    # Status: PENDING, COMPLETED, FAILED
    status = db.Column(db.String(20), default='PENDING', index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_transaction_monitor', 'status', 'created_at'), # For Admin Dashboard (AD-02)
    )

    def __repr__(self):
        return f'<Transaction {self.mpesa_receipt_number} - {self.status}>'

# ============================================================================
# 5. MENU ITEM (Optional Normalized Table)
# ============================================================================
# While B-R4 uses the JSON field in VendorLocation for search speed, 
# this table allows Vendors to manage their "Master Menu" easily.
class MenuItem(db.Model):
    __tablename__ = 'menu_items'
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(500)) # Cloudinary URL
    
    is_available = db.Column(db.Boolean, default=True)