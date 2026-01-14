from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import VendorLocation, MenuItem, User, Order, db
from app.utils.cloudinary_service import upload_image
from datetime import datetime, timedelta

bp = Blueprint('vendor', __name__, url_prefix='/api/vendor')

# --- 1. UPLOAD IMAGE ---
@bp.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files:
        return jsonify({'error': 'No image part'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    image_url = upload_image(file)
    if image_url:
        return jsonify({'success': True, 'url': image_url}), 200
    else:
        return jsonify({'error': 'Upload failed'}), 500

# --- 2. CHECK-IN ---
@bp.route('/checkin', methods=['POST'])
@jwt_required()
def check_in():
    vendor_id = get_jwt_identity()
    data = request.get_json()

    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if not location:
        location = VendorLocation(vendor_id=vendor_id)
        db.session.add(location)

    location.latitude = data.get('latitude')
    location.longitude = data.get('longitude')
    location.address = data.get('address')
    location.menu_items = data.get('menu_items', [])
    location.check_in() 
    
    db.session.commit()

    return jsonify({
        'success': True, 
        'remaining_seconds': 10800,
        'message': 'You are live!'
    }), 200

# --- 3. GET STATUS ---
@bp.route('/status', methods=['GET'])
@jwt_required()
def get_status():
    vendor_id = get_jwt_identity()
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()

    if not location:
        return jsonify({'is_open': False, 'remaining_seconds': 0, 'menu_items': []}), 200

    now = datetime.utcnow()
    remaining = 0
    
    if location.is_open and location.auto_close_at:
        delta = location.auto_close_at - now
        remaining = int(delta.total_seconds())

    if remaining <= 0 and location.is_open:
        location.is_open = False
        location.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'is_open': False, 'remaining_seconds': 0, 'menu_items': location.menu_items}), 200

    return jsonify({
        'is_open': True,
        'remaining_seconds': remaining,
        'address': location.address,
        'menu_items': location.menu_items or []
    }), 200

# --- 4. GET ORDERS (NEW) ---
@bp.route('/orders', methods=['GET'])
@jwt_required()
def get_vendor_orders():
    vendor_id = get_jwt_identity()
    
    orders = Order.query.filter_by(vendor_id=vendor_id).order_by(Order.created_at.desc()).all()
    
    output = []
    for order in orders:
        output.append({
            'id': order.id,
            'customer_phone': order.customer_phone,
            'amount': order.total_amount,
            'status': order.status,
            'created_at': order.created_at,
            'items': order.items,
            'delivery_location': order.delivery_location,
            # Pass Coordinates for Mapping
            'customer_lat': order.customer_latitude,
            'customer_lon': order.customer_longitude,
            'mpesa_receipt_number': order.transaction.mpesa_receipt_number if order.transaction else None
        })
    
    return jsonify({'success': True, 'orders': output}), 200

# --- 5. CLOSE VENDOR ---
@bp.route('/close', methods=['POST'])
@jwt_required()
def close_vendor():
    vendor_id = get_jwt_identity()
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    
    if location:
        location.is_open = False
        location.auto_close_at = datetime.utcnow() 
        db.session.commit()
        
    return jsonify({'success': True}), 200