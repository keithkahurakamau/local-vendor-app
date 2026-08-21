from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
# FIXED: Removed 'MenuItem' from imports
from app.models import VendorLocation, User, Order, db, Promotion
from app.utils.cloudinary_service import upload_image
from app.utils.ai_helper import generate_food_description
from app.utils.decorators import vendor_required
from app.utils.menu import normalise_menu_items
from app.utils.analytics import build_analytics
from app.utils import order_status as st
from app.utils.notifications import notify_followers_of_checkin, notify_customers_vendor_closed
from app.utils.notify import push
from datetime import datetime, timedelta

bp = Blueprint('vendor', __name__, url_prefix='/api/vendor')

# --- 1. UPLOAD IMAGE ---
@bp.route('/upload', methods=['POST'])
@vendor_required
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
@vendor_required
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
    # Save menu items directly as JSON list
    location.menu_items = data.get('menu_items', [])
    location.check_in() 
    
    db.session.commit()

    # Best-effort: never let a mail problem fail the check-in itself.
    notified = notify_followers_of_checkin(User.query.get(vendor_id), location)

    return jsonify({
        'success': True,
        'remaining_seconds': 10800,
        'followers_notified': notified,
        'message': 'You are live!'
    }), 200

# --- 3. GET STATUS ---
@bp.route('/status', methods=['GET'])
@vendor_required
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
        return jsonify({'is_open': False, 'remaining_seconds': 0, 'menu_items': normalise_menu_items(location.menu_items)}), 200

    return jsonify({
        'is_open': True,
        'remaining_seconds': remaining,
        'address': location.address,
        'menu_items': normalise_menu_items(location.menu_items)
    }), 200

# --- 4. GET ORDERS ---
@bp.route('/orders', methods=['GET'])
@vendor_required
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
            'promo_code': order.promo_code,
            'discount_amount': order.discount_amount or 0,
            'delivery_location': order.delivery_location,
            'customer_lat': order.customer_latitude,
            'customer_lon': order.customer_longitude,
            'mpesa_receipt_number': order.transaction.mpesa_receipt_number if order.transaction else None
        })
    
    return jsonify({'success': True, 'orders': output}), 200

# --- 5. CLOSE VENDOR ---
@bp.route('/close', methods=['POST'])
@vendor_required
def close_vendor():
    """
    Go offline.

    Refuses while orders are paid for but not collected: the customer's money has
    already moved, and closing silently leaves them staring at "Preparing" forever
    with nobody cooking. Pass force=true to close anyway - the affected customers
    are then emailed so they can chase the vendor or cancel.
    """
    vendor_id = int(get_jwt_identity())
    location = VendorLocation.query.filter_by(vendor_id=vendor_id).first()

    outstanding = (Order.query
                   .filter(Order.vendor_id == vendor_id,
                           Order.status.in_(st.UNFULFILLED_STATUSES))
                   .order_by(Order.created_at.asc())
                   .all())

    force = bool((request.get_json(silent=True) or {}).get('force'))

    if outstanding and not force:
        return jsonify({
            'error': f'You still have {len(outstanding)} paid order(s) waiting.',
            'outstanding': len(outstanding),
            'orders': [{
                'id': o.id,
                'order_number': o.order_number,
                'status': o.status,
                'amount': o.total_amount,
                'customer_phone': o.customer_phone,
            } for o in outstanding],
            'hint': 'Finish or cancel them, or send force=true to close anyway.',
        }), 409

    notified = 0
    if location:
        location.is_open = False
        location.auto_close_at = datetime.utcnow()
        db.session.commit()

    if outstanding:
        notified = notify_customers_vendor_closed(User.query.get(vendor_id), outstanding)

    return jsonify({
        'success': True,
        'closed_with_outstanding': len(outstanding),
        'customers_notified': notified,
    }), 200

# --- 6. UPDATE PROFILE ---
@bp.route('/profile', methods=['PUT'])
@vendor_required
def update_profile():
    vendor_id = get_jwt_identity()
    user = User.query.get(vendor_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json() or {}

    # This route only owns the vendor's business fields. It used to accept username
    # and password in the payload and silently drop them, so the UI reported success
    # while nothing had changed. Reject up front, before mutating anything.
    rejected = [f for f in ('username', 'email', 'password') if f in data]
    if rejected:
        return jsonify({
            'error': f"Use /api/auth/me for {', '.join(rejected)}.",
            'hint': 'Passwords go through POST /api/auth/change-password.',
        }), 400

    if 'business_name' in data:
        user.business_name = data['business_name']
    if 'phone_number' in data:
        user.phone_number = data['phone_number']
    if 'storefront_image_url' in data:
        user.storefront_image_url = data['storefront_image_url']

    db.session.commit()
    return jsonify({'success': True, 'message': 'Profile updated'}), 200

# --- 7. AI MENU DESCRIPTION ---
@bp.route('/generate-description', methods=['POST'])
@vendor_required
def generate_desc():
    data = request.get_json()
    item_name = data.get('item_name')
    
    if not item_name:
        return jsonify({'error': 'Item name required'}), 400
        
    description = generate_food_description(item_name)
    return jsonify({'success': True, 'description': description}), 200

# --- 8. ANALYTICS ---
@bp.route('/analytics', methods=['GET'])
@vendor_required
def get_analytics():
    """Real numbers for the vendor dashboard, scoped strictly to the caller."""
    vendor_id = get_jwt_identity()
    orders = Order.query.filter_by(vendor_id=vendor_id).all()
    return jsonify({'success': True, **build_analytics(orders)}), 200


# --- 9. UPDATE ORDER STATUS ---
@bp.route('/order/<int:order_id>/status', methods=['PATCH'])
@vendor_required
def update_order_status(order_id):
    """
    Advance an order through fulfilment.

    Transitions are validated server-side: the status is shown to the customer, so
    a vendor must not be able to skip straight to Collected.
    """
    vendor_id = int(get_jwt_identity())
    order = Order.query.filter_by(id=order_id, vendor_id=vendor_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404

    target = (request.get_json() or {}).get('status')
    if not target:
        return jsonify({'error': 'status is required'}), 400

    if not st.can_transition(order.status, target):
        return jsonify({
            'error': f'Cannot move an order from "{order.status}" to "{target}".',
            'allowed': st.allowed_next(order.status),
        }), 409

    order.status = target
    db.session.commit()

    COPY = {
        st.PREPARING: ('Your order is being prepared', 'The vendor has started cooking.'),
        st.READY: ('Your order is ready', 'Head over and collect it.'),
        st.COLLECTED: ('Order collected', 'Enjoy - and leave a rating if you have a moment.'),
        st.CANCELLED: ('Order cancelled', 'The vendor cancelled this order.'),
    }
    if order.customer_id and target in COPY:
        title, body = COPY[target]
        push(order.customer_id, 'order_status', title,
             f'{order.order_number} - {body}', '/customer/profile')

    return jsonify({
        'success': True,
        'order': {'id': order.id, 'order_number': order.order_number,
                  'status': order.status, 'allowed_next': st.allowed_next(order.status)},
    }), 200


# --- 10. PROMOTIONS ---
@bp.route('/promotions', methods=['GET'])
@vendor_required
def list_promotions():
    vendor_id = int(get_jwt_identity())
    rows = Promotion.query.filter_by(vendor_id=vendor_id).order_by(Promotion.created_at.desc()).all()
    return jsonify({'success': True, 'promotions': [p.to_dict() for p in rows]}), 200


@bp.route('/promotions', methods=['POST'])
@vendor_required
def create_promotion():
    vendor_id = int(get_jwt_identity())
    data = request.get_json() or {}

    code = str(data.get('code') or '').strip().upper()[:24]
    if not code:
        return jsonify({'error': 'A code is required.'}), 400

    try:
        percent_off = int(data.get('percent_off'))
    except (TypeError, ValueError):
        return jsonify({'error': 'percent_off must be a whole number.'}), 400
    # Capped: a 100% code would let anyone eat free on a typo.
    if not 1 <= percent_off <= 70:
        return jsonify({'error': 'Discount must be between 1% and 70%.'}), 400

    if Promotion.query.filter_by(vendor_id=vendor_id, code=code).first():
        return jsonify({'error': f'You already have a code called {code}.'}), 409

    expires_at = None
    if data.get('expires_at'):
        try:
            expires_at = datetime.fromisoformat(str(data['expires_at']).replace('Z', ''))
        except ValueError:
            return jsonify({'error': 'expires_at must be an ISO date.'}), 400

    promo = Promotion(
        vendor_id=vendor_id, code=code, percent_off=percent_off,
        min_order=float(data.get('min_order') or 0),
        max_redemptions=data.get('max_redemptions'),
        expires_at=expires_at,
    )
    db.session.add(promo)
    db.session.commit()
    return jsonify({'success': True, 'promotion': promo.to_dict()}), 201


@bp.route('/promotions/<int:promo_id>', methods=['PATCH'])
@vendor_required
def toggle_promotion(promo_id):
    vendor_id = int(get_jwt_identity())
    promo = Promotion.query.filter_by(id=promo_id, vendor_id=vendor_id).first()
    if not promo:
        return jsonify({'error': 'Promotion not found'}), 404
    promo.is_active = bool((request.get_json() or {}).get('is_active', not promo.is_active))
    db.session.commit()
    return jsonify({'success': True, 'promotion': promo.to_dict()}), 200


@bp.route('/promotions/<int:promo_id>', methods=['DELETE'])
@vendor_required
def delete_promotion(promo_id):
    vendor_id = int(get_jwt_identity())
    promo = Promotion.query.filter_by(id=promo_id, vendor_id=vendor_id).first()
    if not promo:
        return jsonify({'error': 'Promotion not found'}), 404
    db.session.delete(promo)
    db.session.commit()
    return jsonify({'success': True}), 200
