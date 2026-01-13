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
        # Check if item is in menu_items
        menu_data = vendor.menu_items
        menu_items = []
        
        # Robust parsing of menu_items
        if isinstance(menu_data, dict):
            menu_items = menu_data.get('items', [])
        elif isinstance(menu_data, list):
            menu_items = menu_data
            
        # FIX: Use partial match instead of exact match
        # If user searches "chips", it should match "chips masala"
        has_item = any(search_term in str(i).lower() for i in menu_items)
        
        if not has_item:
            continue

        # Calculate distance using Haversine
        distance = haversine_distance(
            customer_lat, customer_lon,
            vendor.latitude, vendor.longitude
        )

        # Only include vendors within 5km
        if distance <= 5.0:
            nearby_vendors.append({
                'id': vendor.id,
                'vendor_id': vendor.vendor_id,
                'latitude': vendor.latitude,
                'longitude': vendor.longitude,
                'menu_items': vendor.menu_items,
                'distance': round(distance, 2),
                # FIX: Changed updated_at to created_at
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
        radius = float(radius) / 1000  # Convert to km
    except ValueError:
        return jsonify({'error': 'Invalid latitude, longitude, or radius'}), 400

    # Get vendors updated within last 3 hours
    three_hours_ago = datetime.utcnow() - timedelta(hours=3)
    
    # FIX: Changed updated_at to created_at
    vendors = VendorLocation.query.filter(
        VendorLocation.created_at >= three_hours_ago
    ).all()

    # Filter by proximity
    nearby_vendors = []
    for vendor in vendors:
        # Calculate distance
        distance = haversine_distance(
            customer_lat, customer_lon,
            vendor.latitude, vendor.longitude
        )

        # Only include vendors within specified radius
        if distance <= radius:
            nearby_vendors.append({
                'id': vendor.id,
                'vendor_id': vendor.vendor_id,
                'latitude': vendor.latitude,
                'longitude': vendor.longitude,
                'menu': vendor.menu_items,
                'distance': round(distance * 1000, 2),  # Convert back to meters
                # FIX: Changed updated_at to created_at
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
    radius = request.args.get('radius', 5000)  # Default 5km

    try:
        if customer_lat and customer_lon:
            customer_lat = float(customer_lat)
            customer_lon = float(customer_lon)
            radius = float(radius) / 1000  # Convert to km
        else:
            # Use default Nairobi CBD location if no user location provided
            customer_lat, customer_lon = -1.2864, 36.8172
            radius = 10.0  # 10km default radius for fallback
    except ValueError:
        return jsonify({'error': 'Invalid latitude, longitude, or radius'}), 400

    # Get vendors that are currently active (checked in within 3 hours)
    three_hours_ago = datetime.utcnow() - timedelta(hours=3)
    
    # FIX: Changed updated_at to created_at
    vendor_locations = VendorLocation.query.filter(
        VendorLocation.created_at >= three_hours_ago
    ).all()

    vendor_list = []
    for location in vendor_locations:
        vendor = location.vendor
        if vendor:
            # Calculate distance
            distance = haversine_distance(
                customer_lat, customer_lon,
                location.latitude, location.longitude
            )

            # Only include vendors within specified radius
            if distance <= radius:
                vendor_list.append({
                    'id': vendor.id,
                    'name': vendor.business_name or vendor.username,
                    'image': vendor.storefront_image_url or '/images/vendor-default.jpg',
                    'rating': 4.5,  # Default rating, could be enhanced with actual ratings
                    'cuisine': 'Local Cuisine',  # Could be enhanced with actual cuisine data
                    'categories': ['all'],  # Default category
                    'distance': round(distance, 1),
                    'updated': 'Now',  # Could be enhanced with actual timestamp
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

    # Create Transaction record with status 'PENDING'
    transaction = Transaction(
        vendor_id=vendor_id,
        customer_phone=customer_phone,
        amount=amount,
        status='PENDING'
    )
    db.session.add(transaction)
    db.session.commit()

    # Simulate M-Pesa STK push response
    mock_response = {
        'CheckoutRequestID': f'ws_CO_{transaction.id}_123456789',
        'ResponseCode': '0',
        'ResponseDescription': 'Success. Request accepted for processing',
        'CustomerMessage': 'Success. Request accepted for processing'
    }

    # Store checkout request ID
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

    # Check if vendor is active (updated within 3 hours)
    if location.auto_close_at < datetime.utcnow():
        return jsonify({'error': 'Vendor is currently offline'}), 404

    # Calculate distance from a default location (Nairobi CBD)
    default_lat, default_lon = -1.2864, 36.8172
    distance = haversine_distance(default_lat, default_lon, location.latitude, location.longitude)

    # Extract menu items and create categories
    menu_data = location.menu_items
    
    # Robust safety check for menu items
    menu_items = []
    prices = {}
    if isinstance(menu_data, dict):
        menu_items = menu_data.get('items', [])
        prices = menu_data.get('prices', {})
    elif isinstance(menu_data, list):
        menu_items = menu_data

    # Create menu items with prices
    formatted_menu_items = []
    for idx, item in enumerate(menu_items):
        #handle both string items and dict items
        if isinstance(item, dict):
            item_name = item.get('name', 'Unknown Item')
            item_price = item.get('price', prices.get(item_name, 0))
        else:
            #item is a string
            item_name = str(item)
            item_price = prices.get(item_name, 0)
        
        formatted_menu_items.append({
            'id': hash(item_name) % 10000 if item_name else idx,
            'name': item_name,
            'price': item_price,
            'description': f'Delicious {item_name.lower()}',
            'category': 'main',  # Default category, can be enhanced
            'popular': True if 'chapati' in item_name.lower() or 'pilau' in item_name.lower() else False
        })

    # Create categories from menu items
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
        'image': vendor.storefront_image_url or '/images/vendor-default.jpg',
        'rating': 4.5,  # Placeholder
        'reviews': '1.2k',  # Placeholder
        'address': f'Location near Nairobi CBD',  # Placeholder
        'status': 'Open Now' if location.is_open else 'Closed',
        'cuisine': 'Local Cuisine',  # Placeholder
        'delivery': True,
        'minOrder': 100,
        'distance': f"{round(distance, 1)} km",
        'lastSeen': location.created_at.isoformat(), # FIX: Changed updated_at to created_at
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
    customer_lat = request.args.get('lat')
    customer_lon = request.args.get('lon')
    radius = request.args.get('radius', 100)  # Default 100 meters

    if not all([customer_lat, customer_lon]):
        return jsonify({'error': 'lat and lon parameters required'}), 400

    try:
        customer_lat = float(customer_lat)
        customer_lon = float(customer_lon)
        radius = float(radius) / 1000  # Convert to km for haversine
    except ValueError:
        return jsonify({'error': 'Invalid latitude, longitude, or radius'}), 400

    # Mock landmark data for Nairobi area (in a real app, this would come from a POI database or API)
    landmarks = [
        {'name': 'Nairobi CBD', 'lat': -1.2864, 'lon': 36.8172, 'type': 'area'},
        {'name': 'Westlands Shopping Centre', 'lat': -1.2630, 'lon': 36.8065, 'type': 'mall'},
        {'name': 'Karen Shopping Centre', 'lat': -1.3167, 'lon': 36.7833, 'type': 'mall'},
        {'name': 'River Road Market', 'lat': -1.2921, 'lon': 36.8219, 'type': 'market'},
        {'name': 'Luthuli Avenue', 'lat': -1.2833, 'lon': 36.8167, 'type': 'street'},
        {'name': 'Tom Mboya Street', 'lat': -1.2844, 'lon': 36.8204, 'type': 'street'},
        {'name': 'Koinange Street', 'lat': -1.2858, 'lon': 36.8228, 'type': 'street'},
        {'name': 'Sarit Centre', 'lat': -1.2654, 'lon': 36.7879, 'type': 'mall'},
        {'name': 'The Junction Mall', 'lat': -1.2332, 'lon': 36.7841, 'type': 'mall'},
        {'name': 'Two Rivers Mall', 'lat': -1.3083, 'lon': 36.6917, 'type': 'mall'},
        {'name': 'Yaya Centre', 'lat': -1.2642, 'lon': 36.8048, 'type': 'mall'},
        {'name': 'Village Market', 'lat': -1.2306, 'lon': 36.8028, 'type': 'mall'},
        {'name': 'Nairobi Hospital', 'lat': -1.3006, 'lon': 36.8065, 'type': 'hospital'},
        {'name': 'Kenyatta International Conference Centre', 'lat': -1.2878, 'lon': 36.8233, 'type': 'venue'},
        {'name': 'University of Nairobi', 'lat': -1.2764, 'lon': 36.8167, 'type': 'university'},
        {'name': 'Nairobi Railway Station', 'lat': -1.2921, 'lon': 36.8219, 'type': 'station'},
        {'name': 'Main Gate - University of Nairobi', 'lat': -1.2764, 'lon': 36.8167, 'type': 'gate'},
        {'name': 'Westlands Main Gate', 'lat': -1.2630, 'lon': 36.8065, 'type': 'gate'},
        {'name': 'Karen Blixen Museum', 'lat': -1.3167, 'lon': 36.7833, 'type': 'museum'},
        {'name': 'Nairobi National Park Gate', 'lat': -1.3683, 'lon': 36.8583, 'type': 'gate'}
    ]

    # Filter landmarks within radius and calculate distances
    nearby_landmarks = []
    for landmark in landmarks:
        distance = haversine_distance(
            customer_lat, customer_lon,
            landmark['lat'], landmark['lon']
        )

        # Convert distance to meters
        distance_meters = distance * 1000

        if distance_meters <= float(request.args.get('radius', 100)):
            nearby_landmarks.append({
                'name': landmark['name'],
                'type': landmark['type'],
                'latitude': landmark['lat'],
                'longitude': landmark['lon'],
                'distance': round(distance_meters, 1)
            })

    # Sort by distance (closest first)
    nearby_landmarks.sort(key=lambda x: x['distance'])

    return jsonify({
        'success': True,
        'landmarks': nearby_landmarks,
        'search_criteria': {
            'customer_location': [customer_lat, customer_lon],
            'max_distance_meters': float(request.args.get('radius', 100)),
            'total_found': len(nearby_landmarks)
        }
    }), 200

@bp.route('/callback', methods=['POST'])
def mpesa_callback():
    """B-R7: M-Pesa Callback endpoint"""
    callback_data = request.get_json()

    from app.utils.mpesa_handler import mpesa_handler
    result = mpesa_handler.process_callback(callback_data)

    if result['success']:
        # Find and update transaction
        checkout_request_id = callback_data.get('Body', {}).get('stkCallback', {}).get('CheckoutRequestID')
        transaction = Transaction.query.filter_by(mpesa_receipt_number=checkout_request_id).first()

        if transaction:
            transaction.status = 'COMPLETED'
            transaction.mpesa_receipt_number = result['receipt_number']
            db.session.commit()

    return jsonify({'success': True}), 200
