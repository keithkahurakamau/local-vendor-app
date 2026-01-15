from app.extensions import db
from datetime import datetime, timedelta
from sqlalchemy import JSON
from sqlalchemy import CheckConstraint, Index, event, select, update
import random
import string

# ============================================================================
# 1. USER TABLE - Authentication & Roles
# ============================================================================
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    phone_number = db.Column(db.String(15), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    role = db.Column(db.String(10), nullable=False)   

    # Vendor Profile Data
    business_name = db.Column(db.String(100))
    owner_name = db.Column(db.String(100))
    
    # Cloudinary Storefront Image
    storefront_image_url = db.Column(db.String(500))
    storefront_image_public_id = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    location = db.relationship('VendorLocation', backref='vendor', uselist=False, cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='vendor', lazy='dynamic')
    transactions = db.relationship('Transaction', backref='vendor', lazy='dynamic')

    __table_args__ = (
        CheckConstraint("role IN ('vendor', 'admin')", name='check_user_role'),
    )

# ============================================================================
# 2. VENDOR LOCATION - The Core "Finder" Data
# ============================================================================
class VendorLocation(db.Model):
    __tablename__ = 'vendor_locations'
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)

    latitude = db.Column(db.Float, nullable=False, index=True)
    longitude = db.Column(db.Float, nullable=False, index=True)
    address = db.Column(db.String(255)) 

    # Read-Model: Optimized JSON for search (B-R4)
    menu_items = db.Column(JSON, nullable=False) 

    # Real-Time Freshness Logic (B-R5)
    is_open = db.Column(db.Boolean, default=False, index=True)
    last_checkin = db.Column(db.DateTime)       
    auto_close_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_location_search', 'latitude', 'longitude', 'is_open'),
    )

    def check_in(self):
        self.is_open = True
        self.last_checkin = datetime.utcnow()
        self.auto_close_at = datetime.utcnow() + timedelta(hours=3)
        self.updated_at = datetime.utcnow()

# ============================================================================
# 3. ORDER - Order Management
# ============================================================================
class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    # Changed length to 30 to accommodate the new format
    order_number = db.Column(db.String(30), unique=True, nullable=False) 

    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    customer_phone = db.Column(db.String(15), nullable=False, index=True)
    items = db.Column(JSON, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='New Order') 
    
    delivery_location = db.Column(db.String(255), nullable=True)

    customer_latitude = db.Column(db.Float, nullable=True)
    customer_longitude = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    transaction = db.relationship('Transaction', backref='order', uselist=False)

    @staticmethod
    def generate_order_number():
        """
        Generates a unique, collision-proof order number using Timestamp + Random.
        Format: ORD-YYMMDDHH-XXXX (e.g., ORD-25011512-AB12)
        """
        timestamp = datetime.utcnow().strftime('%y%m%d%H') # YYMMDDHH
        # Generate 4 random uppercase letters/digits
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        return f"ORD-{timestamp}-{random_str}"

# ============================================================================
# 4. TRANSACTION - M-Pesa Logs
# ============================================================================
class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id', ondelete='CASCADE'), nullable=True)
    
    customer_phone = db.Column(db.String(15), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    
    # This matches the "CheckoutRequestID" from M-Pesa
    checkout_request_id = db.Column(db.String(100), unique=True, index=True) 
    
    mpesa_receipt_number = db.Column(db.String(50), unique=True, nullable=True)
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow) 
    status = db.Column(db.String(20), default='PENDING', index=True) 

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

# ============================================================================
# 5. MENU ITEM (Write-Model for Admin/Vendor)
# ============================================================================
class MenuItem(db.Model):
    __tablename__ = 'menu_items'
    
    id = db.Column(db.Integer, primary_key=True)
    vendor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(500))
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ============================================================================
# 6. EVENT LISTENERS (CQRS Sync Logic)
# ============================================================================
@event.listens_for(MenuItem, 'after_insert')
@event.listens_for(MenuItem, 'after_update')
@event.listens_for(MenuItem, 'after_delete')
def update_search_index(mapper, connection, target):
    """
    Auto-updates the VendorLocation JSON whenever the MenuItem table changes.
    """
    items_table = MenuItem.__table__
    stmt = select(items_table).where(
        items_table.c.vendor_id == target.vendor_id,
        items_table.c.is_available == True
    )
    results = connection.execute(stmt).fetchall()
    
    menu_snapshot = []
    for row in results:
        menu_snapshot.append({
            "name": row.name,
            "price": row.price,
            "image": row.image_url,
            "available": row.is_available
        })
    
    loc_table = VendorLocation.__table__
    connection.execute(
        update(loc_table)
        .where(loc_table.c.vendor_id == target.vendor_id)
        .values(menu_items=menu_snapshot, updated_at=datetime.utcnow())
    )