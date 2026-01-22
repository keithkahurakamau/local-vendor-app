from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import VendorLocation, User, Order, Transaction
from app.utils.geospatial import haversine_distance
from app.utils.mpesa_handler import MpesaHandler
from datetime import datetime
from flask_cors import cross_origin

bp = Blueprint('customer', __name__, url_prefix='/api/customer')
mpesa_handler = MpesaHandler()

# --- 1. SEARCH VENDORS ---
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

        menu_list = v.menu_items if v.menu_items and isinstance(v.menu_items, list) else []
        found = False
        for i in menu_list:
            if isinstance(i, dict):
                if item in i.get('name', '').lower() or item in i.get('desc', '').lower():
                    found = True; break
            elif isinstance(i, str) and item in i.lower():
                found = True; break
                    
        if found:
            results.append({
                'id': v.id, 
                'vendor_id': v.vendor_id, 
                'latitude': v.latitude, 
                'longitude': v.longitude, 
                'distance': round(dist, 1),
                'menu_items': v.menu_items,
                'name': v.vendor.business_name if v.vendor else "Unknown",
                'image': v.vendor.storefront_image_url if v.vendor else None,
                'status': 'Open'
            })
            
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
    results = []
    
    for v in vendors:
        dist = haversine_distance(lat, lon, v.latitude, v.longitude)
        if dist <= rad:
            results.append({
                'id': v.id, 
                'vendor_id': v.vendor_id,
                'latitude': v.latitude, 
                'longitude': v.longitude, 
                'distance': round(dist, 1),
                'menu': v.menu_items,
                'name': v.vendor.business_name if v.vendor else "Unknown",
                'image': v.vendor.storefront_image_url if v.vendor else None,
                'status': 'Open',
                'updated': v.updated_at
            })

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

        formatted_menu = []
        if loc.menu_items and isinstance(loc.menu_items, list):
            for i in loc.menu_items:
                if isinstance(i, dict):
                    formatted_menu.append({
                        'id': i.get('id', str(datetime.now().timestamp())), 
                        'name': i.get('name', 'Unknown'), 
                        'price': i.get('price', 0),
                        'description': i.get('desc', ''), 
                        'image': i.get('image', None), 
                        'category': 'main'
                    })

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

    try:
        new_order = Order(
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