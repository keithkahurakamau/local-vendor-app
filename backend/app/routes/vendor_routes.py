from flask import Blueprint, request, jsonify
from app.utils.decorators import vendor_required
from app.models import VendorLocation, Transaction, MenuItem
from app.extensions import db
from datetime import datetime, timedelta
import cloudinary.uploader

bp = Blueprint('vendor', __name__, url_prefix='/api/vendor')

# --- NEW: Get Current Status ---
@bp.route('/status', methods=['GET'])
@vendor_required
def get_status():
    """
    Get current vendor status based on the 3-hour rule.
    """
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()
    
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    
    # Default closed if no location found
    if not location:
        return jsonify({'is_open': False}), 200
        
    # Check if manually open AND within time limit
    is_active = False
    remaining_seconds = 0
    
    if location.is_open and location.auto_close_at:
        now = datetime.utcnow()
        if location.auto_close_at > now:
            is_active = True
            remaining_seconds = (location.auto_close_at - now).total_seconds()
        else:
            # Time expired: Update DB to reflect closed state
            location.is_open = False
            location.auto_close_at = None
            db.session.commit()
            is_active = False

    return jsonify({
        'is_open': is_active,
        'remaining_seconds': remaining_seconds,
        'address': location.address,
        'menu_items': location.menu_items
    }), 200

# --- NEW: Manual Close Endpoint ---
@bp.route('/close', methods=['POST'])
@vendor_required
def close_business():
    """Manually close the business"""
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()
    
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if location:
        location.is_open = False
        location.auto_close_at = None
        db.session.commit()
        
    return jsonify({'success': True, 'message': 'Business closed successfully'}), 200

@bp.route('/upload-image', methods=['POST'])
def upload_image():
    """
    Dedicated endpoint to upload an image to Cloudinary.
    Returns: { "url": "https://res.cloudinary.com/..." }
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file,
            folder="local_vendor_app/menu_items"
        )
        
        return jsonify({
            'success': True,
            'url': upload_result['secure_url'],
            'public_id': upload_result['public_id']
        }), 200
        
    except Exception as e:
        print(f"Upload Error: {e}")
        return jsonify({'error': 'Image upload failed'}), 500

@bp.route('/checkin', methods=['POST'])
@vendor_required
def checkin():
    """V-01: Vendor Check-In endpoint"""
    data = request.get_json()
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()

    latitude = data.get('latitude')
    longitude = data.get('longitude')
    address = data.get('address')
    menu_items = data.get('menu_items')

    if not all([latitude, longitude, menu_items]):
        return jsonify({'error': 'Latitude, longitude, and menu_items required'}), 400

    # Update or create vendor location
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()

    if location:
        location.latitude = latitude
        location.longitude = longitude
        location.address = address
        location.menu_items = menu_items
        location.check_in()  # Sets is_open=True, last_checkin=now, auto_close_at=3 hours
    else:
        location = VendorLocation(
            vendor_id=vendor_id,
            latitude=latitude,
            longitude=longitude,
            address=address,
            menu_items=menu_items
        )
        location.check_in()
        db.session.add(location)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Check-in successful',
        'location_id': location.id
    }), 200

@bp.route('/menu', methods=['POST'])
@vendor_required
def update_menu():
    """Update the menu_items JSON field"""
    data = request.get_json()
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()

    menu_items = data.get('menu_items')
    if not menu_items:
        return jsonify({'error': 'menu_items required'}), 400
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()

    if not location:
        return jsonify({'error': 'Vendor location not found. Please check in first.'}), 404

    location.menu_items = menu_items
    location.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Menu updated successfully'
    }), 200

@bp.route('/orders', methods=['GET'])
@vendor_required
def get_orders():
    """Get vendor's transaction history"""
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()
    transactions = Transaction.query.filter_by(vendor_id=vendor_id).order_by(Transaction.created_at.desc()).all()

    orders = []
    for transaction in transactions:
        orders.append({
            'id': transaction.id,
            'customer_phone': transaction.customer_phone,
            'amount': transaction.amount,
            'mpesa_receipt_number': transaction.mpesa_receipt_number,
            'status': transaction.status,
            'created_at': transaction.created_at.isoformat(),
            'updated_at': transaction.updated_at.isoformat() if hasattr(transaction, 'updated_at') and transaction.updated_at else None
        })

    return jsonify({
        'success': True,
        'orders': orders
    }), 200

@bp.route('/menu-items', methods=['GET'])
@vendor_required
def get_menu_items():
    """Get all menu items for the vendor"""
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()

    menu_items = MenuItem.query.filter_by(vendor_id=vendor_id).all()

    items = []
    for item in menu_items:
        items.append({
            'id': item.id,
            'name': item.name,
            'price': item.price,
            'image_url': item.image_url,
            'is_available': item.is_available,
            'created_at': item.created_at.isoformat()
        })

    return jsonify({
        'success': True,
        'menu_items': items
    }), 200

@bp.route('/menu-items', methods=['POST'])
@vendor_required
def create_menu_item():
    """Create a new menu item"""
    data = request.get_json()
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()

    name = data.get('name')
    price = data.get('price')
    image_url = data.get('image_url')

    if not name or not price:
        return jsonify({'error': 'Name and price are required'}), 400

    menu_item = MenuItem(
        vendor_id=vendor_id,
        name=name,
        price=price,
        image_url=image_url
    )

    db.session.add(menu_item)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Menu item created successfully',
        'menu_item': {
            'id': menu_item.id,
            'name': menu_item.name,
            'price': menu_item.price,
            'image_url': menu_item.image_url,
            'is_available': menu_item.is_available,
            'created_at': menu_item.created_at.isoformat()
        }
    }), 201

@bp.route('/menu-items/<int:item_id>', methods=['PUT'])
@vendor_required
def update_menu_item(item_id):
    """Update a menu item"""
    data = request.get_json()
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()

    menu_item = MenuItem.query.filter_by(id=item_id, vendor_id=vendor_id).first()
    if not menu_item:
        return jsonify({'error': 'Menu item not found'}), 404

    menu_item.name = data.get('name', menu_item.name)
    menu_item.price = data.get('price', menu_item.price)
    menu_item.image_url = data.get('image_url', menu_item.image_url)
    menu_item.is_available = data.get('is_available', menu_item.is_available)

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Menu item updated successfully',
        'menu_item': {
            'id': menu_item.id,
            'name': menu_item.name,
            'price': menu_item.price,
            'image_url': menu_item.image_url,
            'is_available': menu_item.is_available,
            'created_at': menu_item.created_at.isoformat()
        }
    }), 200

@bp.route('/menu-items/<int:item_id>', methods=['DELETE'])
@vendor_required
def delete_menu_item(item_id):
    """Delete a menu item"""
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()

    menu_item = MenuItem.query.filter_by(id=item_id, vendor_id=vendor_id).first()
    if not menu_item:
        return jsonify({'error': 'Menu item not found'}), 404

    db.session.delete(menu_item)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Menu item deleted successfully'
    }), 200