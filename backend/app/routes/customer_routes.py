from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import VendorLocation, User, Order, Transaction, Favourite, Review, Address, Promotion, Notification
from app.utils.geospatial import haversine_distance
from app.utils.menu import normalise_menu_items, menu_matches
from app.utils import order_status as st
from app.utils.notify import push
from app.utils import rate_limit
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from app.utils.mpesa_handler import MpesaHandler
from datetime import datetime
from flask_cors import cross_origin

bp = Blueprint('customer', __name__, url_prefix='/api/customer')
mpesa_handler = MpesaHandler()

# --- 1. SEARCH VENDORS ---
def _serialise_vendor(v, dist):
    """
    The one shape every vendor list returns.

    /search and /nearby had drifted: search emitted `menu_items` while the
    frontend reads `vendor.menu`, and omitted `updated` and `cheapest_item`. The
    Array.isArray guard on the client turned that into an empty menu rather than
    an error, so a customer searching "samosa" got a card that did not list the
    samosa. Building both payloads here means they cannot disagree again.
    """
    menu = normalise_menu_items(v.menu_items)
    prices = [i['price'] for i in menu if i['price']]
    average, count = vendor_rating(v.vendor_id)
    return {
        'id': v.id,
        'vendor_id': v.vendor_id,
        'latitude': v.latitude,
        'longitude': v.longitude,
        'distance': round(dist, 1),
        'menu': menu,
        'cheapest_item': min(prices) if prices else None,
        'rating': average,
        'rating_count': count,
        'name': v.vendor.business_name if v.vendor else "Unknown",
        'image': v.vendor.storefront_image_url if v.vendor else None,
        'status': 'Open',
        'updated': v.updated_at,
    }


@bp.route('/search', methods=['GET'])
def search_vendors():
    item = request.args.get('item', '').lower().strip()
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
    except: return jsonify({'error': 'Invalid params'}), 400

    vendors = VendorLocation.query.filter(VendorLocation.auto_close_at > datetime.utcnow()).all()
    
    results = []
    for v in vendors:
        dist = haversine_distance(lat, lon, v.latitude, v.longitude)
        if dist > 5.0: continue

        if menu_matches(v.menu_items, item):
            results.append(_serialise_vendor(v, dist))
            
    return jsonify({'success': True, 'vendors': results}), 200

# --- 2. GET NEARBY VENDORS ---
@bp.route('/nearby', methods=['GET'])
def get_nearby_vendors():
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        rad = float(request.args.get('radius', 5000)) / 1000 
    except: return jsonify({'error': 'Invalid params'}), 400

    vendors = VendorLocation.query.filter(VendorLocation.auto_close_at > datetime.utcnow()).all()

    # --- optional filters ---
    def _num(name):
        raw = request.args.get(name)
        try:
            return float(raw) if raw not in (None, '') else None
        except ValueError:
            return None

    max_price = _num('max_price')
    min_price = _num('min_price')
    min_rating = _num('min_rating')
    sort_by = (request.args.get('sort') or 'distance').lower()
    results = []

    for v in vendors:
        dist = haversine_distance(lat, lon, v.latitude, v.longitude)
        if dist > rad:
            continue

        payload = _serialise_vendor(v, dist)
        cheapest = payload['cheapest_item']

        # A price filter asks "can I eat here for X?", so it matches on the cheapest
        # item rather than excluding a stall because one expensive dish is on the menu.
        if max_price is not None and (cheapest is None or cheapest > max_price):
            continue
        if min_price is not None and (cheapest is None or cheapest < min_price):
            continue

        if min_rating is not None and (payload['rating'] is None or payload['rating'] < min_rating):
            continue

        results.append(payload)

    if sort_by == 'rating':
        # Unrated vendors sort last rather than as zero, which would read as "bad".
        results.sort(key=lambda r: (r['rating'] is None, -(r['rating'] or 0), r['distance']))
    elif sort_by == 'price':
        results.sort(key=lambda r: (r['cheapest_item'] is None, r['cheapest_item'] or 0))
    elif sort_by == 'newest':
        results.sort(key=lambda r: r['updated'] or datetime.min, reverse=True)
    else:
        results.sort(key=lambda r: r['distance'])

    return jsonify({'success': True, 'vendors': results}), 200

# --- 3. GET VENDOR DETAILS ---
@bp.route('/vendor/<int:vendor_id>', methods=['GET'])
def get_vendor_details(vendor_id):
    try:
        vendor = User.query.filter_by(id=vendor_id, role='vendor').first()
        if not vendor or not vendor.location: return jsonify({'error': 'Not found'}), 404
        loc = vendor.location
        
        status = 'Open'
        if loc.auto_close_at and loc.auto_close_at < datetime.utcnow(): 
            status = 'Closed'

        formatted_menu = [
            {
                'id': i['id'],
                'name': i['name'],
                'price': i['price'],
                'description': i['desc'],
                'image': i['image'],
                'category': 'main',
            }
            for i in normalise_menu_items(loc.menu_items)
        ]

        return jsonify({
            'success': True,
            'vendor': {
                'id': vendor.id, 
                'name': vendor.business_name, 
                'image': vendor.storefront_image_url,
                'address': loc.address, 
                'status': status,
                'menuItems': formatted_menu,
                'categories': [{'id': 'all', 'name': 'All', 'count': len(formatted_menu)}]
            }
        }), 200
    except Exception as e:
        return jsonify({'error': 'Server Error'}), 500

# --- 4. REAL PAYMENT INTEGRATION (STK PUSH) ---
# STK pushes are the abusable side of this app: five prompts to one handset in
# ten minutes is already generous for a real customer retrying a failed payment.
PAY_LIMIT_PER_PHONE = 5
PAY_LIMIT_PER_IP = 20
PAY_WINDOW = 600  # seconds


@bp.route('/pay', methods=['POST'])
def initiate_payment():
    data = request.get_json()
    
    vendor_id = data.get('vendorId')
    amount = data.get('amount')
    phone = data.get('phone')
    items = data.get('items', [])
    delivery_loc = data.get('deliveryLocation', 'In-Store')
    cust_lat = data.get('customerLat')
    cust_lon = data.get('customerLon')

    if not vendor_id or not amount or not phone:
        return jsonify({'success': False, 'error': 'Missing payment details'}), 400

    # --- rate limit -------------------------------------------------------
    # Each accepted call rings a real handset, so this is throttled on the phone
    # being pushed to (protects the victim) and on the caller's IP (stops one
    # attacker cycling numbers). Guest checkout means there is no JWT to key on.
    digits = ''.join(ch for ch in str(phone) if ch.isdigit())[-9:]
    allowed, retry = rate_limit.check(f'pay:phone:{digits}', PAY_LIMIT_PER_PHONE, PAY_WINDOW)
    if allowed:
        allowed, retry = rate_limit.check(
            f'pay:ip:{request.remote_addr}', PAY_LIMIT_PER_IP, PAY_WINDOW)
    if not allowed:
        return jsonify({
            'success': False,
            'error': 'Too many payment attempts. Please wait a moment and try again.',
            'retry_after': retry,
        }), 429, {'Retry-After': str(retry)}

    try:
        # Optional identity: /pay is reachable without a token (guest checkout), so
        # only attach a customer when one is actually authenticated.
        customer_id = None
        try:
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            customer_id = int(identity) if identity else None
        except Exception:
            customer_id = None

        # --- promo code, revalidated server-side ---
        # The client sends a code, never a price: trusting a client-supplied total
        # would let anyone pay whatever they liked.
        promo = None
        discount = 0.0
        promo_code = str(data.get('promoCode') or data.get('promo_code') or '').strip().upper()
        if promo_code:
            promo = Promotion.query.filter_by(vendor_id=vendor_id, code=promo_code).first()
            if not promo:
                return jsonify({'error': 'That code is not valid for this vendor.'}), 404
            ok, reason = promo.usable(subtotal=amount)
            if not ok:
                return jsonify({'error': reason}), 409
            discount = promo.discount_for(amount)
            amount = round(amount - discount, 2)

        # Per-item notes ("no chilli") travel inside the items JSON. Trim them so a
        # huge payload cannot be stuffed into the vendor's order screen.
        clean_items = []
        for item in (items if isinstance(items, list) else []):
            if not isinstance(item, dict):
                continue
            entry = dict(item)
            note = str(entry.get('note') or '').strip()[:140]
            if note:
                entry['note'] = note
            else:
                entry.pop('note', None)
            clean_items.append(entry)
        items = clean_items

        new_order = Order(
            customer_id=customer_id,
            promo_code=promo.code if promo else None,
            discount_amount=discount,
            order_number=Order.generate_order_number(),
            vendor_id=vendor_id,
            customer_phone=phone,
            total_amount=float(amount),
            items=items,
            delivery_location=delivery_loc,
            customer_latitude=cust_lat,
            customer_longitude=cust_lon,
            status='Pending Payment'
        )
        db.session.add(new_order)
        db.session.flush()

        clean_phone = phone.replace('+', '')

        response = mpesa_handler.initiate_stk_push(
            phone_number=clean_phone,
            amount=int(float(amount)),
            account_reference=new_order.order_number,
            transaction_desc=f"Order {new_order.order_number}"
        )

        if 'ResponseCode' in response and response['ResponseCode'] == '0':
            checkout_id = response.get('CheckoutRequestID')

            new_txn = Transaction(
                vendor_id=vendor_id,
                order_id=new_order.id,
                customer_phone=phone,
                amount=float(amount),
                checkout_request_id=checkout_id,
                status='PENDING', 
                transaction_date=datetime.utcnow()
            )
            db.session.add(new_txn)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'STK Push initiated',
                'order_number': new_order.order_number,
                'order_id': new_order.order_number, # IMPORTANT: Return this for frontend routing
                'checkout_id': checkout_id
            }), 200
        else:
            error_msg = response.get('errorMessage', 'M-Pesa request failed')
            
            failed_txn = Transaction(
                vendor_id=vendor_id,
                order_id=new_order.id,
                customer_phone=phone,
                amount=float(amount),
                checkout_request_id=None, 
                status='FAILED',          
                transaction_date=datetime.utcnow(),
                mpesa_receipt_number=None
            )
            new_order.status = 'Payment Failed'
            
            db.session.add(failed_txn)
            db.session.commit()

            return jsonify({'success': False, 'error': error_msg}), 400

    except Exception as e:
        db.session.rollback()
        print(f"Payment Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --- 5. M-PESA CALLBACK ---
@bp.route('/callback', methods=['POST'])
def mpesa_callback():
    try:
        data = request.get_json()
        
        # --- DEBUG PRINT ---
        print("🔥🔥 M-PESA CALLBACK RECEIVED 🔥🔥")
        # print(data) # Uncomment to see full payload if needed
        # -------------------

        if not data or 'Body' not in data:
            return jsonify({'result': 'ignored'}), 200

        processed_data = mpesa_handler.process_callback(data)
        
        stk_callback = data['Body']['stkCallback']
        checkout_id = stk_callback['CheckoutRequestID']

        txn = Transaction.query.filter_by(checkout_request_id=checkout_id).first()
        if not txn:
            return jsonify({'result': 'not found'}), 404

        if processed_data['success']:
            txn.status = 'SUCCESSFUL'
            # The vendor needs to know a paid order has landed, not discover it later.
            if txn.order:
                push(txn.order.vendor_id, 'new_order', 'New paid order',
                     f'{txn.order.order_number} - KES {txn.order.total_amount:.0f}',
                     '/vendor/orders')
            # Burn the redemption here, not at order creation: a failed or abandoned
            # payment must not consume a limited-use code.
            if txn.order and txn.order.promo_code:
                promo = Promotion.query.filter_by(
                    vendor_id=txn.order.vendor_id, code=txn.order.promo_code).first()
                if promo:
                    promo.times_redeemed = (promo.times_redeemed or 0) + 1
            txn.mpesa_receipt_number = processed_data['receipt_number']
            txn.transaction_date = datetime.utcnow()
            if txn.order:
                txn.order.status = 'Paid'
        else:
            txn.status = 'FAILED'
            if txn.order:
                txn.order.status = 'Payment Failed'

        db.session.commit()
        return jsonify({'result': 'success'}), 200

    except Exception as e:
        print(f"Callback Error: {e}")
        return jsonify({'error': 'Server Error'}), 500

# --- 6. CHECK PAYMENT STATUS (POLLING) ---
@bp.route('/payment-status/<string:identifier>', methods=['GET'])
@cross_origin()
def check_payment_status(identifier):
    """
    Checks the status of a specific M-Pesa transaction.
    Accepts EITHER:
    1. Order Number (HL-XXXXXX)
    2. Checkout Request ID (ws_CO_...)
    """
    try:
        txn = None

        # 1. Try finding by Order Number (HL-...)
        if identifier.startswith('HL-'):
            order = Order.query.filter_by(order_number=identifier).first()
            if order:
                txn = Transaction.query.filter_by(order_id=order.id).first()
        
        # 2. Fallback: Try finding by Checkout Request ID
        if not txn:
            txn = Transaction.query.filter_by(checkout_request_id=identifier).first()
        
        if not txn:
            # If not found yet (race condition), return PENDING
            return jsonify({'status': 'PENDING'}), 200
        
        # Normalize status for frontend
        status = txn.status
        if status == 'SUCCESSFUL': status = 'COMPLETED'

        return jsonify({
            'status': status,
            'amount': txn.amount,
            'receipt': txn.mpesa_receipt_number
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _order_json(order):
    vendor = order.vendor
    location = vendor.location if vendor else None
    vendor_is_live = bool(location and location.auto_close_at
                          and location.auto_close_at > datetime.utcnow())
    return {
        'id': order.id,
        'order_number': order.order_number,
        'status': order.status,
        'timeline_index': st.timeline_index(order.status),
        'timeline': st.CUSTOMER_TIMELINE,
        'total_amount': order.total_amount,
        'items': order.items if isinstance(order.items, list) else [],
        'delivery_location': order.delivery_location,
        'created_at': order.created_at.isoformat() if order.created_at else None,
        'receipt': order.transaction.mpesa_receipt_number if order.transaction else None,
        'vendor': {
            'id': order.vendor_id,
            'name': (vendor.business_name or vendor.username) if vendor else 'Unknown vendor',
            'image': vendor.storefront_image_url if vendor else None,
            'phone': vendor.phone_number if vendor else None,
            'is_live': vendor_is_live,
        },
        # True when the vendor has gone offline leaving this order unfinished.
        'stranded': (not vendor_is_live) and order.status in st.UNFULFILLED_STATUSES,
    }


@bp.route('/orders', methods=['GET'])
@jwt_required()
def my_orders():
    """A signed-in customer's own order history, newest first."""
    customer_id = int(get_jwt_identity())
    orders = (Order.query
              .filter_by(customer_id=customer_id)
              .order_by(Order.created_at.desc())
              .all())
    return jsonify({'success': True, 'orders': [_order_json(o) for o in orders]}), 200


@bp.route('/orders/<string:order_number>', methods=['GET'])
@jwt_required()
def my_order_detail(order_number):
    customer_id = int(get_jwt_identity())
    order = Order.query.filter_by(order_number=order_number).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    # Never leak another customer's order, even with a valid token.
    if order.customer_id != customer_id:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify({'success': True, 'order': _order_json(order)}), 200


# ==========================================================================
# Reviews
# ==========================================================================

def vendor_rating(vendor_id):
    """(average, count) for a vendor. Returns (None, 0) when unrated."""
    rows = Review.query.filter_by(vendor_id=vendor_id).all()
    if not rows:
        return None, 0
    return round(sum(r.rating for r in rows) / len(rows), 1), len(rows)


@bp.route('/orders/<string:order_number>/review', methods=['POST'])
@jwt_required()
def leave_review(order_number):
    """
    Rate a vendor.

    Only allowed for an order the caller paid for and has actually collected -
    that pairing is what stops ratings being manufactured.
    """
    customer_id = int(get_jwt_identity())
    order = Order.query.filter_by(order_number=order_number).first()

    if not order or order.customer_id != customer_id:
        return jsonify({'error': 'Order not found'}), 404

    if order.status != st.COLLECTED:
        return jsonify({
            'error': 'You can review an order once it has been collected.',
            'status': order.status,
        }), 409

    if Review.query.filter_by(order_id=order.id).first():
        return jsonify({'error': 'You have already reviewed this order.'}), 409

    data = request.get_json() or {}
    try:
        rating = int(data.get('rating'))
    except (TypeError, ValueError):
        return jsonify({'error': 'rating must be a whole number from 1 to 5.'}), 400
    if not 1 <= rating <= 5:
        return jsonify({'error': 'rating must be between 1 and 5.'}), 400

    comment = (data.get('comment') or '').strip()[:500]

    review = Review(order_id=order.id, customer_id=customer_id,
                    vendor_id=order.vendor_id, rating=rating, comment=comment or None)
    db.session.add(review)
    db.session.commit()

    average, count = vendor_rating(order.vendor_id)
    return jsonify({'success': True, 'review': {'rating': rating, 'comment': comment},
                    'vendor_rating': average, 'vendor_rating_count': count}), 201


@bp.route('/vendor/<int:vendor_id>/reviews', methods=['GET'])
def vendor_reviews(vendor_id):
    rows = (Review.query.filter_by(vendor_id=vendor_id)
            .order_by(Review.created_at.desc()).limit(50).all())
    average, count = vendor_rating(vendor_id)
    return jsonify({
        'success': True,
        'rating': average,
        'rating_count': count,
        'reviews': [{
            'rating': r.rating,
            'comment': r.comment,
            'customer': (r.customer.username if r.customer else 'Customer'),
            'created_at': r.created_at.isoformat() if r.created_at else None,
        } for r in rows],
    }), 200


# ==========================================================================
# Favourites
# ==========================================================================

@bp.route('/favourites', methods=['GET'])
@jwt_required()
def list_favourites():
    customer_id = int(get_jwt_identity())
    rows = Favourite.query.filter_by(customer_id=customer_id).all()

    out = []
    for fav in rows:
        vendor = fav.vendor
        if not vendor:
            continue
        location = vendor.location
        is_live = bool(location and location.auto_close_at
                       and location.auto_close_at > datetime.utcnow())
        average, count = vendor_rating(vendor.id)
        out.append({
            'vendor_id': vendor.id,
            'name': vendor.business_name or vendor.username,
            'image': vendor.storefront_image_url,
            'is_live': is_live,
            'address': location.address if location else None,
            'latitude': location.latitude if location else None,
            'longitude': location.longitude if location else None,
            'updated': location.updated_at if (location and is_live) else None,
            'rating': average,
            'rating_count': count,
        })
    return jsonify({'success': True, 'favourites': out}), 200


@bp.route('/favourites/<int:vendor_id>', methods=['POST'])
@jwt_required()
def add_favourite(vendor_id):
    customer_id = int(get_jwt_identity())
    vendor = User.query.filter_by(id=vendor_id, role='vendor').first()
    if not vendor:
        return jsonify({'error': 'Vendor not found'}), 404

    if Favourite.query.filter_by(customer_id=customer_id, vendor_id=vendor_id).first():
        return jsonify({'success': True, 'already': True}), 200

    db.session.add(Favourite(customer_id=customer_id, vendor_id=vendor_id))
    db.session.commit()
    return jsonify({'success': True}), 201


@bp.route('/favourites/<int:vendor_id>', methods=['DELETE'])
@jwt_required()
def remove_favourite(vendor_id):
    customer_id = int(get_jwt_identity())
    fav = Favourite.query.filter_by(customer_id=customer_id, vendor_id=vendor_id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
    return jsonify({'success': True}), 200


# ==========================================================================
# Saved addresses
# ==========================================================================

@bp.route('/addresses', methods=['GET'])
@jwt_required()
def list_addresses():
    customer_id = int(get_jwt_identity())
    rows = (Address.query.filter_by(customer_id=customer_id)
            .order_by(Address.is_default.desc(), Address.created_at.desc()).all())
    return jsonify({'success': True, 'addresses': [a.to_dict() for a in rows]}), 200


@bp.route('/addresses', methods=['POST'])
@jwt_required()
def create_address():
    customer_id = int(get_jwt_identity())
    data = request.get_json() or {}

    label = str(data.get('label') or '').strip()[:40]
    details = str(data.get('details') or '').strip()[:200]
    if not label or not details:
        return jsonify({'error': 'Both a label and the address details are required.'}), 400

    address = Address(
        customer_id=customer_id, label=label, details=details,
        latitude=data.get('latitude'), longitude=data.get('longitude'),
        is_default=bool(data.get('is_default')),
    )
    # Exactly one default: clear the others rather than letting two win.
    if address.is_default:
        Address.query.filter_by(customer_id=customer_id).update({'is_default': False})
    elif not Address.query.filter_by(customer_id=customer_id).first():
        address.is_default = True          # first address saved becomes the default

    db.session.add(address)
    db.session.commit()
    return jsonify({'success': True, 'address': address.to_dict()}), 201


@bp.route('/addresses/<int:address_id>', methods=['PUT'])
@jwt_required()
def update_address(address_id):
    customer_id = int(get_jwt_identity())
    address = Address.query.filter_by(id=address_id, customer_id=customer_id).first()
    if not address:
        return jsonify({'error': 'Address not found'}), 404

    data = request.get_json() or {}
    if 'label' in data:
        address.label = str(data['label']).strip()[:40]
    if 'details' in data:
        address.details = str(data['details']).strip()[:200]
    if 'latitude' in data:
        address.latitude = data['latitude']
    if 'longitude' in data:
        address.longitude = data['longitude']
    if data.get('is_default'):
        Address.query.filter_by(customer_id=customer_id).update({'is_default': False})
        address.is_default = True

    db.session.commit()
    return jsonify({'success': True, 'address': address.to_dict()}), 200


@bp.route('/addresses/<int:address_id>', methods=['DELETE'])
@jwt_required()
def delete_address(address_id):
    customer_id = int(get_jwt_identity())
    address = Address.query.filter_by(id=address_id, customer_id=customer_id).first()
    if not address:
        return jsonify({'error': 'Address not found'}), 404

    was_default = address.is_default
    db.session.delete(address)
    db.session.commit()

    # Never leave the customer with zero defaults.
    if was_default:
        nxt = Address.query.filter_by(customer_id=customer_id).first()
        if nxt:
            nxt.is_default = True
            db.session.commit()
    return jsonify({'success': True}), 200


# ==========================================================================
# Promotions (customer side: preview a code before paying)
# ==========================================================================

@bp.route('/promo/preview', methods=['POST'])
def preview_promo():
    """
    Validate a code and return the discount without creating anything.

    Deliberately unauthenticated so the cart can show the price before login,
    and deliberately the same code path checkout uses, so the previewed number
    and the charged number cannot drift apart.
    """
    data = request.get_json() or {}
    code = str(data.get('code') or '').strip().upper()
    vendor_id = data.get('vendorId') or data.get('vendor_id')
    try:
        subtotal = float(data.get('subtotal') or 0)
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid subtotal'}), 400

    if not code or not vendor_id:
        return jsonify({'error': 'A code and vendor are required.'}), 400

    promo = Promotion.query.filter_by(vendor_id=int(vendor_id), code=code).first()
    if not promo:
        return jsonify({'error': 'That code is not valid for this vendor.'}), 404

    ok, reason = promo.usable(subtotal=subtotal)
    if not ok:
        return jsonify({'error': reason}), 409

    discount = promo.discount_for(subtotal)
    return jsonify({
        'success': True, 'code': promo.code, 'percent_off': promo.percent_off,
        'discount': discount, 'total': round(subtotal - discount, 2),
    }), 200


# ==========================================================================
# Reorder + cancel
# ==========================================================================

@bp.route('/orders/<string:order_number>/reorder', methods=['POST'])
@jwt_required()
def reorder(order_number):
    """
    Return a previous order's items so the cart can be refilled in one tap.

    This does NOT place an order - the vendor may have changed their menu or gone
    offline since, so the customer still goes through checkout. Items no longer on
    the menu are reported rather than silently dropped.
    """
    customer_id = int(get_jwt_identity())
    order = Order.query.filter_by(order_number=order_number).first()
    if not order or order.customer_id != customer_id:
        return jsonify({'error': 'Order not found'}), 404

    location = VendorLocation.query.filter_by(vendor_id=order.vendor_id).first()
    is_live = bool(location and location.auto_close_at
                   and location.auto_close_at > datetime.utcnow())
    current = {i['name'].lower(): i for i in normalise_menu_items(location.menu_items if location else [])}

    available, unavailable = [], []
    for item in (order.items if isinstance(order.items, list) else []):
        name = str(item.get('name') or '')
        match = current.get(name.lower())
        if match:
            available.append({**match, 'qty': item.get('qty', 1)})
        else:
            unavailable.append(name)

    vendor = order.vendor
    return jsonify({
        'success': True,
        'vendor': {
            'vendor_id': order.vendor_id,
            'name': (vendor.business_name or vendor.username) if vendor else 'Unknown',
            'image': vendor.storefront_image_url if vendor else None,
            'is_live': is_live,
        },
        'items': available,
        'unavailable': unavailable,
        'delivery_location': order.delivery_location,
    }), 200


@bp.route('/orders/<string:order_number>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_number):
    """
    A customer may cancel only while the vendor has not started cooking. Once the
    order is Preparing, food is already committed and cancelling is unfair to the
    vendor - at that point they have to do it.
    """
    customer_id = int(get_jwt_identity())
    order = Order.query.filter_by(order_number=order_number).first()
    if not order or order.customer_id != customer_id:
        return jsonify({'error': 'Order not found'}), 404

    location = order.vendor.location if order.vendor else None
    vendor_is_live = bool(location and location.auto_close_at
                          and location.auto_close_at > datetime.utcnow())

    # Once a vendor starts cooking, cancelling is unfair to them - unless they have
    # gone offline entirely, in which case nobody is cooking and the customer would
    # otherwise be stuck holding a paid order forever.
    cancellable = {st.PENDING, st.PAID}
    if not vendor_is_live:
        cancellable |= set(st.UNFULFILLED_STATUSES)

    if order.status not in cancellable:
        return jsonify({
            'error': f'This order is already "{order.status}" and can no longer be cancelled here.',
            'hint': 'Call the vendor to sort it out.',
        }), 409

    order.status = st.CANCELLED
    db.session.commit()
    return jsonify({'success': True, 'status': order.status}), 200


# ==========================================================================
# Notifications (shared by both roles - the blueprint prefix is /api/customer
# but the rows are keyed by user_id, so a vendor's bell uses these too)
# ==========================================================================

@bp.route('/notifications', methods=['GET'])
@jwt_required()
def list_notifications():
    user_id = int(get_jwt_identity())
    rows = (Notification.query
            .filter_by(user_id=user_id)
            .order_by(Notification.created_at.desc())
            .limit(40).all())
    unread = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({
        'success': True,
        'unread': unread,
        'notifications': [n.to_dict() for n in rows],
    }), 200


@bp.route('/notifications/<int:note_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(note_id):
    user_id = int(get_jwt_identity())
    note = Notification.query.filter_by(id=note_id, user_id=user_id).first()
    if not note:
        return jsonify({'error': 'Not found'}), 404
    note.is_read = True
    db.session.commit()
    return jsonify({'success': True}), 200


@bp.route('/notifications/read-all', methods=['POST'])
@jwt_required()
def mark_all_notifications_read():
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'success': True}), 200
