from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import VendorLocation, MenuItem, User, db
from app.utils.cloudinary_service import upload_image
from datetime import datetime, timedelta

bp = Blueprint('vendor', __name__, url_prefix='/api/vendor')

# --- 1. UPLOAD IMAGE (Public Access for Registration) ---
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

# --- 2. CHECK-IN (BROADCAST LOCATION & MENU) ---
@bp.route('/checkin', methods=['POST'])
@jwt_required()
def check_in():
    vendor_id = get_jwt_identity()
    data = request.get_json()

    # 1. Find or Create Location
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    if not location:
        location = VendorLocation(vendor_id=vendor_id)
        db.session.add(location)

    # 2. Update Coordinates
    location.latitude = data.get('latitude')
    location.longitude = data.get('longitude')
    location.address = data.get('address')
    
    # 3. Update Menu (Optimized Read Model)
    location.menu_items = data.get('menu_items', [])
    
    # 4. Go Live (Set Open + Timer)
    location.check_in() # Sets auto_close_at to Now + 3 Hours
    
    db.session.commit()

    return jsonify({
        'success': True, 
        'remaining_seconds': 10800, # 3 hours
        'message': 'You are live!'
    }), 200

# --- 3. GET STATUS (SYNC FRONTEND WITH SERVER) ---
@bp.route('/status', methods=['GET'])
@jwt_required()
def get_status():
    vendor_id = get_jwt_identity()
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()

    # If no location exists, they are closed
    if not location:
        return jsonify({'is_open': False, 'remaining_seconds': 0, 'menu_items': []}), 200

    now = datetime.utcnow()
    remaining = 0
    
    # Check Logic: If open, calculate time left
    if location.is_open and location.auto_close_at:
        delta = location.auto_close_at - now
        remaining = int(delta.total_seconds())

    # CRITICAL FIX: If time expired, force Close in DB
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

# --- 4. CLOSE VENDOR MANUALLY ---
@bp.route('/close', methods=['POST'])
@jwt_required()
def close_vendor():
    vendor_id = get_jwt_identity()
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()
    
    if location:
        location.is_open = False
        location.auto_close_at = datetime.utcnow() # Expire immediately
        db.session.commit()
        
    return jsonify({'success': True}), 200