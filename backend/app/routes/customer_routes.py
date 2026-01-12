from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, VendorLocation, MenuItem, Order, db
from datetime import datetime
import random
import string

bp = Blueprint('customer', __name__, url_prefix='/api/customer')

# --- 0. VENDOR DETAILS ---
@bp.route('/vendor/<int:vendor_id>', methods=['GET'])
def get_vendor_details(vendor_id):
    """
    Get detailed information about a specific vendor including their menu.
    """
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if not location:
        return jsonify({'success': False, 'error': 'Vendor not found'}), 404
    
    vendor_user = User.query.get(vendor_id)
    
    # Get menu items
    items = MenuItem.query.filter_by(vendor_id=vendor_id, is_available=True).all()
    
    # Calculate status based on check-in time
    from datetime import datetime, timedelta
    is_open = location.is_open
    status = "Open"
    if is_open and location.last_check_in:
        expires_at = location.last_check_in + timedelta(hours=3)
        if datetime.utcnow() > expires_at:
            is_open = False
            status = "Closed (Expired)"
    elif not is_open:
        status = "Closed"
    
    return jsonify({
        'success': True,
        'vendor': {
            'id': vendor_id,
            'name': vendor_user.business_name or vendor_user.username if vendor_user else "Unknown Vendor",
            'business_name': vendor_user.business_name or vendor_user.username if vendor_user else "Unknown Vendor",
            'address': location.address,
            'latitude': location.latitude,
            'longitude': location.longitude,
            'image': vendor_user.image_url if vendor_user else None,
            'status': status,
            'is_open': is_open,
            'updated_at': location.last_check_in.isoformat() if location.last_check_in else None,
            'menuItems': [{
                'id': i.id,
                'name': i.name,
                'price': i.price,
                'desc': i.description,
                'image': i.image_url
            } for i in items]
        }
    }), 200

# --- 1. DISCOVERY: Find Vendors ---
@bp.route('/vendors', methods=['GET'])
def get_active_vendors():
    """
    Get a list of all vendors who are currently 'checked in' (is_open=True).
    """
    active_locations = VendorLocation.query.filter_by(is_open=True).all()
    
    vendors_list = []
    for loc in active_locations:
        vendor_user = User.query.get(loc.vendor_id)
        if vendor_user:
            vendors_list.append({
                'vendor_id': loc.vendor_id,
                'business_name': vendor_user.business_name or vendor_user.username,
                'address': loc.address,
                'latitude': loc.latitude,
                'longitude': loc.longitude
            })

    return jsonify({'success': True, 'vendors': vendors_list}), 200

# --- 2. BROWSING: Get Vendor Menu ---
@bp.route('/vendor/<int:vendor_id>/menu', methods=['GET'])
def get_vendor_menu(vendor_id):
    """
    Get the menu items for a specific vendor.
    """
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if not location or not location.is_open:
        return jsonify({'error': 'Vendor is currently closed or invalid'}), 404

    items = MenuItem.query.filter_by(vendor_id=vendor_id, is_available=True).all()
    
    return jsonify({
        'success': True,
        'vendor_name': location.vendor.business_name if location.vendor else "Vendor",
        'vendor_address': location.address,
        'menu': [{
            'id': i.id,
            'name': i.name,
            'price': i.price,
            'image_url': i.image_url
        } for i in items]
    }), 200

# --- 3. PURCHASING: Place an Order ---
@bp.route('/order', methods=['POST'])
@jwt_required()
def place_order():
    customer_id = get_jwt_identity()
    user = User.query.get(customer_id)
    data = request.get_json()

    vendor_id = data.get('vendor_id')
    
    # Validate Vendor
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if not location or not location.is_open:
        return jsonify({'error': 'Vendor is not available'}), 400

    # Generate Order Number
    order_ref = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # Create Order
    new_order = Order(
        order_number=f"ORD-{order_ref}",
        customer_id=customer_id,
        vendor_id=vendor_id,
        customer_phone=user.phone_number,
        total_amount=data.get('total_amount'),
        items=data.get('items'), # Expecting JSON list of items from frontend
        delivery_location=data.get('delivery_location'),
        status='PENDING',
        created_at=datetime.utcnow()
    )

    db.session.add(new_order)
    db.session.commit()

    return jsonify({
        'success': True, 
        'message': 'Order placed successfully', 
        'order_id': new_order.id,
        'order_number': new_order.order_number
    }), 201

# --- 4. TRACKING: Get Customer Orders ---
@bp.route('/my-orders', methods=['GET'])
@jwt_required()
def get_my_orders():
    customer_id = get_jwt_identity()
    
    # Fetch orders, newest first
    orders = Order.query.filter_by(customer_id=customer_id).order_by(Order.created_at.desc()).all()

    return jsonify({
        'success': True,
        'orders': [{
            'id': o.id,
            'order_number': o.order_number,
            'vendor_name': o.vendor.business_name if o.vendor else "Unknown Vendor",
            'total_amount': o.total_amount,
            'status': o.status,
            'items_summary': f"{len(o.items)} items",
            'date': o.created_at.strftime("%d-%m-%Y %H:%M")
        } for o in orders]
    }), 200