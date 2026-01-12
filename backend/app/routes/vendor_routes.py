from flask import Blueprint, request, jsonify
from app.utils.decorators import vendor_required
from app.models import VendorLocation, Transaction, MenuItem
from app.extensions import db
from datetime import datetime, timedelta
import cloudinary.uploader

bp = Blueprint('vendor', __name__, url_prefix='/api/vendor')

@bp.route('/status', methods=['GET'])
@vendor_required
def get_status():
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()
    
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    
    if not location:
        return jsonify({'is_open': False}), 200
        
    is_active = False
    remaining_seconds = 0
    
    if location.is_open and location.auto_close_at:
        now = datetime.utcnow()
        if location.auto_close_at > now:
            is_active = True
            remaining_seconds = (location.auto_close_at - now).total_seconds()
        else:
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

@bp.route('/close', methods=['POST'])
@vendor_required
def close_business():
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
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    try:
        upload_result = cloudinary.uploader.upload(file, folder="local_vendor_app/menu_items")
        return jsonify({
            'success': True,
            'url': upload_result['secure_url'],
            'public_id': upload_result['public_id']
        }), 200
    except Exception as e:
        return jsonify({'error': 'Image upload failed'}), 500

@bp.route('/checkin', methods=['POST'])
@vendor_required
def checkin():
    data = request.get_json()
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()

    if not all([data.get('latitude'), data.get('longitude'), data.get('menu_items')]):
        return jsonify({'error': 'Missing required fields'}), 400

    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if location:
        location.latitude = data.get('latitude')
        location.longitude = data.get('longitude')
        location.address = data.get('address')
        location.menu_items = data.get('menu_items')
        location.check_in()
    else:
        location = VendorLocation(
            vendor_id=vendor_id,
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            address=data.get('address'),
            menu_items=data.get('menu_items')
        )
        location.check_in()
        db.session.add(location)
    db.session.commit()
    return jsonify({'success': True, 'location_id': location.id}), 200

@bp.route('/menu', methods=['POST'])
@vendor_required
def update_menu():
    data = request.get_json()
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if not location: return jsonify({'error': 'Vendor not found'}), 404
    location.menu_items = data.get('menu_items')
    location.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True}), 200

@bp.route('/orders', methods=['GET'])
@vendor_required
def get_orders():
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()
    transactions = Transaction.query.filter_by(vendor_id=vendor_id).order_by(Transaction.created_at.desc()).all()
    orders = [{
        'id': t.id,
        'customer_phone': t.customer_phone,
        'amount': t.amount,
        'mpesa_receipt_number': t.mpesa_receipt_number,
        'status': t.status,
        'created_at': t.created_at.isoformat()
    } for t in transactions]
    return jsonify({'success': True, 'orders': orders}), 200

@bp.route('/menu-items', methods=['GET', 'POST'])
@vendor_required
def handle_menu_items():
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()
    if request.method == 'GET':
        items = MenuItem.query.filter_by(vendor_id=vendor_id).all()
        return jsonify({'success': True, 'menu_items': [{'id': i.id, 'name': i.name, 'price': i.price, 'image_url': i.image_url} for i in items]}), 200
    
    data = request.get_json()
    item = MenuItem(vendor_id=vendor_id, name=data.get('name'), price=data.get('price'), image_url=data.get('image_url'))
    db.session.add(item)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Created'}), 201

@bp.route('/menu-items/<int:item_id>', methods=['PUT', 'DELETE'])
@vendor_required
def handle_single_item(item_id):
    from flask_jwt_extended import get_jwt_identity
    vendor_id = get_jwt_identity()
    item = MenuItem.query.filter_by(id=item_id, vendor_id=vendor_id).first()
    if not item: return jsonify({'error': 'Not found'}), 404
    
    if request.method == 'DELETE':
        db.session.delete(item)
        db.session.commit()
        return jsonify({'success': True}), 200
        
    data = request.get_json()
    item.name = data.get('name', item.name)
    item.price = data.get('price', item.price)
    item.image_url = data.get('image_url', item.image_url)
    db.session.commit()
    return jsonify({'success': True}), 200