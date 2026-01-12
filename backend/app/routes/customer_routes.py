from flask import Blueprint, request, jsonify
from app.models import VendorLocation, User, Transaction
from app.utils.geospatial import haversine_distance
from app.extensions import db
from datetime import datetime, timedelta

bp = Blueprint('customer', __name__, url_prefix='/api/customer')

@bp.route('/search', methods=['GET'])
def search_vendors():
    """C-01: Customer Search endpoint"""
    item = request.args.get('item')
    customer_lat = request.args.get('lat')
    customer_lon = request.args.get('lon')

    if not all([item, customer_lat, customer_lon]):
        return jsonify({'error': 'Item, lat, and lon parameters required'}), 400

    try:
        customer_lat = float(customer_lat)
        customer_lon = float(customer_lon)
    except ValueError:
        return jsonify({'error': 'Invalid latitude or longitude'}), 400

    # Step 1 (Freshness): Filter out any location where auto_close_at < datetime.utcnow()
    vendors = VendorLocation.query.filter(
        VendorLocation.auto_close_at > datetime.utcnow()
    ).all()

    # Step 2 (Inventory) & Step 3 (Proximity)
    nearby_vendors = []
    search_term = item.lower().strip()

    for vendor in vendors:
        menu_data = vendor.menu_items
        menu_items = []
        
        if isinstance(menu_data, dict):
            menu_items = menu_data.get('items', [])
        elif isinstance(menu_data, list):
            menu_items = menu_data
            
        has_item = False
        for i in menu_items:
            if isinstance(i, dict):
                if search_term in i.get('name', '').lower():
                    has_item = True
                    break
            elif isinstance(i, str):
                if search_term in i.lower():
                    has_item = True
                    break
        
        if not has_item:
            continue

        distance = haversine_distance(
            customer_lat, customer_lon,
            vendor.latitude, vendor.longitude
        )

        if distance <= 5.0:
            nearby_vendors.append({
                'id': vendor.id,
                'vendor_id': vendor.vendor_id,
                'latitude': vendor.latitude,
                'longitude': vendor.longitude,
                'menu_items': vendor.menu_items,
                'distance': round(distance, 2),
                'last_updated': vendor.created_at.isoformat() if hasattr(vendor, 'created_at') else datetime.utcnow().isoformat()
            })

    return jsonify({
        'success': True,
        'vendors': nearby_vendors,
        'search_criteria': {
            'item': item,
            'customer_location': [customer_lat, customer_lon],
            'max_distance_km': 5.0,
            'freshness_hours': 3
        }
    }), 200

@bp.route('/nearby', methods=['GET'])
def get_nearby_vendors():
    """Get all vendors near user location (regardless of menu)"""
    customer_lat = request.args.get('lat')
    customer_lon = request.args.get('lon')
    radius = request.args.get('radius', 5000)

    if not all([customer_lat, customer_lon]):
        return jsonify({'error': 'lat and lon parameters required'}), 400

    try:
        customer_lat = float(customer_lat)
        customer_lon = float(customer_lon)
        radius = float(radius) / 1000
    except ValueError:
        return jsonify({'error': 'Invalid latitude, longitude, or radius'}), 400

    three_hours_ago = datetime.utcnow() - timedelta(hours=3)
    vendors = VendorLocation.query.filter(
        VendorLocation.created_at >= three_hours_ago
    ).all()

    nearby_vendors = []
    for vendor in vendors:
        distance = haversine_distance(
            customer_lat, customer_lon,
            vendor.latitude, vendor.longitude
        )

        if distance <= radius:
            nearby_vendors.append({
                'id': vendor.id,
                'vendor_id': vendor.vendor_id,
                'latitude': vendor.latitude,
                'longitude': vendor.longitude,
                'menu': vendor.menu_items,
                'distance': round(distance * 1000, 2),
                'last_updated': vendor.created_at.isoformat()
            })

    return jsonify({
        'success': True,
        'vendors': nearby_vendors,
        'search_criteria': {
            'customer_location': [customer_lat, customer_lon],
            'max_distance_km': radius,
            'freshness_hours': 3
        }
    }), 200

@bp.route('/vendors', methods=['GET'])
def get_vendors():
    """Get all vendors for landing page with optional location-based filtering"""
    customer_lat = request.args.get('lat')
    customer_lon = request.args.get('lon')
    radius = request.args.get('radius', 5000)

    try:
        if customer_lat and customer_lon:
            customer_lat = float(customer_lat)
            customer_lon = float(customer_lon)
            radius = float(radius) / 1000
        else:
            customer_lat, customer_lon = -1.2864, 36.8172
            radius = 10.0
    except ValueError:
        return jsonify({'error': 'Invalid latitude, longitude, or radius'}), 400

    three_hours_ago = datetime.utcnow() - timedelta(hours=3)
    vendor_locations = VendorLocation.query.filter(
        VendorLocation.created_at >= three_hours_ago
    ).all()

    vendor_list = []
    for location in vendor_locations:
        vendor = location.vendor
        if vendor:
            distance = haversine_distance(
                customer_lat, customer_lon,
                location.latitude, location.longitude
            )

            if distance <= radius:
                vendor_list.append({
                    'id': vendor.id,
                    'name': vendor.business_name or vendor.username,
                    'image': vendor.storefront_image_url or '',
                    'rating': 4.5,
                    'cuisine': 'Local Cuisine',
                    'categories': ['all'], 
                    'distance': round(distance, 1),
                    'updated': 'Now',
                    'status': 'Open' if location.is_open else 'Closed',
                    'location': f'Near {location.address or "Nairobi"}',
                    'menu_items': location.menu_items
                })

    return jsonify({'vendors': vendor_list})

@bp.route('/pay', methods=['POST'])
def initiate_payment():
    """B-R6: Initiate M-Pesa STK Push"""
    data = request.get_json()
    vendor_id = data.get('vendor_id')
    amount = data.get('amount')
    customer_phone = data.get('customer_phone')

    if not all([vendor_id, amount, customer_phone]):
        return jsonify({'error': 'vendor_id, amount, and customer_phone required'}), 400

    transaction = Transaction(
        vendor_id=vendor_id,
        customer_phone=customer_phone,
        amount=amount,
        status='PENDING'
    )
    db.session.add(transaction)
    db.session.commit()

    # MOCK RESPONSE (Replace with real M-Pesa API Call in production)
    mock_response = {
        'CheckoutRequestID': f'ws_CO_{transaction.id}_{int(datetime.now().timestamp())}',
        'ResponseCode': '0',
        'ResponseDescription': 'Success. Request accepted for processing',
        'CustomerMessage': 'Success. Request accepted for processing'
    }

    transaction.mpesa_receipt_number = mock_response.get('CheckoutRequestID')
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'STK Push initiated',
        'checkout_request_id': mock_response.get('CheckoutRequestID'),
        'response_code': mock_response.get('ResponseCode')
    }), 200

@bp.route('/vendor/<int:vendor_id>', methods=['GET'])
def get_vendor_details(vendor_id):
    """Get detailed information about a specific vendor including menu items"""
    vendor = User.query.filter_by(id=vendor_id, role='vendor').first()
    if not vendor:
        return jsonify({'error': 'Vendor not found'}), 404

    location = vendor.location
    if not location:
        return jsonify({'error': 'Vendor location not found'}), 404

    if location.auto_close_at < datetime.utcnow():
        return jsonify({'error': 'Vendor is currently offline'}), 404

    default_lat, default_lon = -1.2864, 36.8172
    distance = haversine_distance(default_lat, default_lon, location.latitude, location.longitude)

    menu_data = location.menu_items
    formatted_menu_items = []
    
    if isinstance(menu_data, list) and len(menu_data) > 0 and isinstance(menu_data[0], dict):
        for item in menu_data:
            formatted_menu_items.append({
                'id': hash(item.get('name', '')) % 10000,
                'name': item.get('name', 'Unknown'),
                'price': item.get('price', 0),
                'description': item.get('description', ''),
                'image': item.get('image', None),
                'category': 'main', 
                'popular': False 
            })
            
    elif isinstance(menu_data, list) and len(menu_data) > 0 and isinstance(menu_data[0], str):
        for item_name in menu_data:
            formatted_menu_items.append({
                'id': hash(item_name) % 10000,
                'name': item_name,
                'price': 0,
                'description': f'{item_name}',
                'category': 'main',
                'image': None,
                'popular': False
            })
            
    elif isinstance(menu_data, dict):
        items = menu_data.get('items', [])
        prices = menu_data.get('prices', {})
        for item_name in items:
            formatted_menu_items.append({
                'id': hash(item_name) % 10000,
                'name': item_name,
                'price': prices.get(item_name, 0),
                'description': f'{item_name}',
                'category': 'main',
                'image': None,
                'popular': False
            })

    categories = [{'id': 'all', 'name': 'All', 'count': len(formatted_menu_items)}]
    category_counts = {}
    for item in formatted_menu_items:
        cat = item['category']
        category_counts[cat] = category_counts.get(cat, 0) + 1

    for cat, count in category_counts.items():
        categories.append({
            'id': cat,
            'name': cat.title(),
            'count': count
        })

    vendor_data = {
        'id': vendor.id,
        'name': vendor.business_name or vendor.username,
        'image': vendor.storefront_image_url or '',
        'rating': 4.5,
        'reviews': '0',
        'address': location.address or 'Nairobi',
        'status': 'Open Now' if location.is_open else 'Closed',
        'cuisine': 'Local Cuisine',
        'delivery': True,
        'minOrder': 0,
        'distance': f"{round(distance, 1)} km",
        'lastSeen': location.created_at.isoformat(),
        'menuItems': formatted_menu_items,
        'categories': categories
    }

    return jsonify({
        'success': True,
        'vendor': vendor_data
    }), 200

@bp.route('/landmarks', methods=['GET'])
def get_nearby_landmarks():
    """Get nearby landmarks for delivery location selection"""
    # Removed all mock data. 
    # Returns empty list until database or external API is connected.
    return jsonify({
        'success': True,
        'landmarks': [],
        'search_criteria': {
            'total_found': 0
        }
    }), 200

@bp.route('/callback', methods=['POST'])
def mpesa_callback():
    """B-R7: M-Pesa Callback endpoint"""
    callback_data = request.get_json()

    from app.utils.mpesa_handler import mpesa_handler
    result = mpesa_handler.process_callback(callback_data)

    if result['success']:
        checkout_request_id = callback_data.get('Body', {}).get('stkCallback', {}).get('CheckoutRequestID')
        transaction = Transaction.query.filter_by(mpesa_receipt_number=checkout_request_id).first()

        if transaction:
            transaction.status = 'COMPLETED'
            transaction.mpesa_receipt_number = result['receipt_number']
            db.session.commit()

    return jsonify({'success': True}), 200