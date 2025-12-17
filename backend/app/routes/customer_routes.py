from flask import Blueprint, request, jsonify
from app.models import VendorLocation, User
from app.extensions import db
from sqlalchemy import func
from datetime import datetime

bp = Blueprint('customer', __name__, url_prefix='/api/customer')

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula (in meters)"""
    from math import radians, cos, sin, asin, sqrt
    
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Radius of earth in meters
    
    return c * r

@bp.route('/search', methods=['GET'])
def search_vendors():
    """
    Search for vendors near user location that have specific food item
    Query params:
        - item: food item to search (required)
        - lat: user latitude (required)
        - lon: user longitude (required)
        - radius: search radius in meters (default: 5000)
    """
    
    item = request.args.get('item', '').strip()
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    radius = request.args.get('radius', default=5000, type=int)
    
    # Validation
    if not item:
        return jsonify({'error': 'Search item is required'}), 400
    
    if lat is None or lon is None:
        return jsonify({'error': 'User location (lat, lon) is required'}), 400
    
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        return jsonify({'error': 'Invalid coordinates'}), 400
    
    try:
        # Get all active vendor locations
        vendor_locations = VendorLocation.query.join(User).all()
        
        results = []
        for location in vendor_locations:
            # Calculate distance
            distance = calculate_distance(lat, lon, location.latitude, location.longitude)
            
            # Filter by radius
            if distance > radius:
                continue
            
            # Check if vendor has the searched item
            menu_items = location.menu_items.get('items', [])
            
            # Case-insensitive search in menu items
            item_found = any(
                item.lower() in menu_item.lower() 
                for menu_item in menu_items
            )
            
            if not item_found:
                continue
            
            # Get vendor details
            vendor = location.vendor
            
            # Build response
            vendor_data = {
                'id': vendor.id,
                'name': vendor.username,
                'phone': vendor.phone_number,
                'location': {
                    'latitude': location.latitude,
                    'longitude': location.longitude
                },
                'distance': round(distance, 2),  # in meters
                'distance_km': round(distance / 1000, 2),  # in km
                'menu': location.menu_items,
                'last_updated': location.updated_at.isoformat(),
                'checked_in_at': location.created_at.isoformat()
            }
            
            results.append(vendor_data)
        
        # Sort by distance (closest first)
        results.sort(key=lambda x: x['distance'])
        
        return jsonify({
            'success': True,
            'count': len(results),
            'search_params': {
                'item': item,
                'user_location': {'lat': lat, 'lon': lon},
                'radius_meters': radius,
                'radius_km': radius / 1000
            },
            'vendors': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@bp.route('/vendors/<int:vendor_id>', methods=['GET'])
def get_vendor_details(vendor_id):
    """
    Get detailed information about a specific vendor
    """
    
    try:
        vendor = User.query.get(vendor_id)
        
        if not vendor or vendor.role != 'vendor':
            return jsonify({'error': 'Vendor not found'}), 404
        
        location = vendor.location
        
        if not location:
            return jsonify({'error': 'Vendor is not currently checked in'}), 404
        
        vendor_data = {
            'id': vendor.id,
            'name': vendor.username,
            'phone': vendor.phone_number,
            'location': {
                'latitude': location.latitude,
                'longitude': location.longitude
            },
            'menu': location.menu_items,
            'last_updated': location.updated_at.isoformat(),
            'checked_in_at': location.created_at.isoformat()
        }
        
        return jsonify({
            'success': True,
            'vendor': vendor_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@bp.route('/orders', methods=['POST'])
def create_order():
    """
    Create order intent (payment flow handled separately)
    Request body:
        - vendor_id: int
        - items: list of {name: str, quantity: int, price: float}
        - customer_phone: str
        - total_amount: float
    """
    
    data = request.get_json()
    
    # Validation
    required_fields = ['vendor_id', 'items', 'customer_phone', 'total_amount']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    
    vendor_id = data['vendor_id']
    items = data['items']
    customer_phone = data['customer_phone']
    total_amount = data['total_amount']
    
    # Validate vendor exists
    vendor = User.query.get(vendor_id)
    if not vendor or vendor.role != 'vendor':
        return jsonify({'error': 'Invalid vendor'}), 404
    
    # Validate items structure
    if not isinstance(items, list) or len(items) == 0:
        return jsonify({'error': 'Items must be a non-empty list'}), 400
    
    for item in items:
        if not all(k in item for k in ['name', 'quantity', 'price']):
            return jsonify({'error': 'Each item must have name, quantity, and price'}), 400
    
    # Validate phone number (basic)
    if not customer_phone.startswith('+') or len(customer_phone) < 10:
        return jsonify({'error': 'Invalid phone number format'}), 400
    
    # Validate amount
    if total_amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400
    
    # Here, when payment is implemented, you would:
    # 1. Create Transaction record
    # 2. Initiate M-Pesa STK Push
    # 3. Return transaction ID for tracking
    
    return jsonify({
        'success': True,
        'message': 'Order validated successfully',
        'order_summary': {
            'vendor': {
                'id': vendor.id,
                'name': vendor.username,
                'phone': vendor.phone_number
            },
            'items': items,
            'total_amount': total_amount,
            'customer_phone': customer_phone
        },
        'next_step': 'Payment integration pending'
    }), 201


@bp.route('/nearby', methods=['GET'])
def get_nearby_vendors():
    """
    Get all vendors near user (regardless of menu items)
    Query params:
        - lat: user latitude (required)
        - lon: user longitude (required)
        - radius: search radius in meters (default: 5000)
    """
    
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    radius = request.args.get('radius', default=5000, type=int)
    
    if lat is None or lon is None:
        return jsonify({'error': 'User location (lat, lon) is required'}), 400
    
    try:
        vendor_locations = VendorLocation.query.join(User).all()
        
        results = []
        for location in vendor_locations:
            distance = calculate_distance(lat, lon, location.latitude, location.longitude)
            
            if distance > radius:
                continue
            
            vendor = location.vendor
            
            vendor_data = {
                'id': vendor.id,
                'name': vendor.username,
                'phone': vendor.phone_number,
                'location': {
                    'latitude': location.latitude,
                    'longitude': location.longitude
                },
                'distance': round(distance, 2),
                'distance_km': round(distance / 1000, 2),
                'menu': location.menu_items,
                'last_updated': location.updated_at.isoformat()
            }
            
            results.append(vendor_data)
        
        results.sort(key=lambda x: x['distance'])
        
        return jsonify({
            'success': True,
            'count': len(results),
            'vendors': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500