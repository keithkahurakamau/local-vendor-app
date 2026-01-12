from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, VendorLocation, MenuItem, Order, db
from datetime import datetime
import cloudinary.uploader 

bp = Blueprint('vendor', __name__, url_prefix='/api/vendor')

# --- 1. CHECK-IN & LOCATION ---
@bp.route('/checkin', methods=['POST'])
@jwt_required()
def vendor_checkin():
    vendor_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    
    # Update or Create Location
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if not location:
        # Initialize new location
        location = VendorLocation(vendor_id=vendor_id)
        db.session.add(location)
    
    # Update fields
    location.latitude = data.get('latitude')
    location.longitude = data.get('longitude')
    location.address = data.get('address')
    
    # Ensure the model has a check_in method, otherwise handle manually
    if hasattr(location, 'check_in'):
        location.check_in() 
    else:
        location.is_open = True
        location.updated_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'You are now online!'}), 200

@bp.route('/status', methods=['GET'])
@jwt_required()
def get_status():
    vendor_id = get_jwt_identity()
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    
    is_online = location.is_open if location else False
    return jsonify({
        'online': is_online, 
        'location': location.address if location else None
    }), 200

@bp.route('/close', methods=['POST'])
@jwt_required()
def close_vendor():
    vendor_id = get_jwt_identity()
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if location:
        location.is_open = False
        location.auto_close_at = None
        db.session.commit()
    return jsonify({'success': True}), 200

# --- 2. IMAGE UPLOAD (PUBLIC) ---
# NOTE: No @jwt_required() here so new users can upload during registration
@bp.route('/upload-image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(file)
        return jsonify({
            'success': True, 
            'url': upload_result['secure_url']
        }), 200
    except Exception as e:
        print(f"Upload Error: {e}")
        return jsonify({'error': 'Image upload failed'}), 500

# --- 3. MENU MANAGEMENT ---
@bp.route('/menu', methods=['GET', 'POST'])
@jwt_required()
def manage_menu():
    vendor_id = get_jwt_identity()
    
    if request.method == 'POST':
        data = request.get_json()
        
        # Validation
        if not data.get('name') or not data.get('price'):
            return jsonify({'error': 'Name and Price are required'}), 400

        new_item = MenuItem(
            vendor_id=vendor_id,
            name=data.get('name'),
            price=data.get('price'),
            image_url=data.get('image_url') or "https://via.placeholder.com/150", 
            is_available=True
        )
        db.session.add(new_item)
        db.session.commit()
        
        # Return the created item so frontend can update state immediately
        return jsonify({
            'success': True, 
            'message': 'Item added',
            'item': {
                'id': new_item.id,
                'name': new_item.name,
                'price': new_item.price,
                'image': new_item.image_url,
                'available': new_item.is_available
            }
        }), 201

    # GET: Fetch all items
    items = MenuItem.query.filter_by(vendor_id=vendor_id).all()
    return jsonify({
        'success': True,
        'items': [{
            'id': i.id, 
            'name': i.name, 
            'price': i.price, 
            'image': i.image_url, 
            'available': i.is_available
        } for i in items]
    }), 200

@bp.route('/menu/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_menu_item(item_id):
    vendor_id = get_jwt_identity()
    item = MenuItem.query.filter_by(id=item_id, vendor_id=vendor_id).first()
    if item:
        db.session.delete(item)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Item removed'}), 200
    return jsonify({'error': 'Item not found'}), 404

# --- 4. ORDER MANAGEMENT ---
@bp.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    vendor_id = get_jwt_identity()
    # Fetch PENDING orders first, then others
    orders = Order.query.filter_by(vendor_id=vendor_id).order_by(Order.created_at.desc()).all()
    
    return jsonify({
        'success': True,
        'orders': [{
            'id': o.id,
            'order_number': o.order_number,
            'customer_phone': o.customer_phone,
            'total_amount': o.total_amount,
            'status': o.status, # PENDING, ACCEPTED, REJECTED, READY, COMPLETED
            'items': o.items,
            'delivery_location': o.delivery_location,
            'created_at': o.created_at.strftime("%H:%M")
        } for o in orders]
    }), 200

@bp.route('/order/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    vendor_id = get_jwt_identity()
    data = request.get_json()
    new_status = data.get('status') # ACCEPTED / REJECTED / READY

    order = Order.query.filter_by(id=order_id, vendor_id=vendor_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
        
    order.status = new_status
    db.session.commit()
    
    return jsonify({'success': True, 'message': f'Order marked as {new_status}'}), 200