from flask import Blueprint, request, jsonify
from app.models import VendorLocation, User, Transaction
from app.utils.geospatial import haversine_distance
from app.extensions import db
from datetime import datetime, timedelta

bp = Blueprint('customer', __name__, url_prefix='/api/customer')

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
        menu_list = v.menu_items if v.menu_items and isinstance(v.menu_items, list) else []
        found = False
        for i in menu_list:
            if isinstance(i, dict):
                if item in i.get('name', '').lower() or item in i.get('desc', '').lower():
                    found = True; break
            elif isinstance(i, str) and item in i.lower():
                found = True; break
                    
        if found:
            dist = haversine_distance(lat, lon, v.latitude, v.longitude)
            if dist <= 5.0:
                results.append({
                    'id': v.id, 'vendor_id': v.vendor_id, 'latitude': v.latitude, 
                    'longitude': v.longitude, 'distance': round(dist, 2),
                    'menu_items': v.menu_items
                })
    return jsonify({'success': True, 'vendors': results}), 200

@bp.route('/vendor/<int:vendor_id>', methods=['GET'])
def get_vendor_details(vendor_id):
    try:
        vendor = User.query.filter_by(id=vendor_id, role='vendor').first()
        if not vendor or not vendor.location: return jsonify({'error': 'Not found'}), 404
        loc = vendor.location
        if loc.auto_close_at and loc.auto_close_at < datetime.utcnow(): return jsonify({'error': 'Offline'}), 404

        raw_menu = loc.menu_items
        formatted_menu = []
        if raw_menu and isinstance(raw_menu, list):
            for i in raw_menu:
                try:
                    if isinstance(i, dict):
                        formatted_menu.append({
                            'id': i.get('id', str(datetime.now().timestamp())), 
                            'name': i.get('name', 'Unknown'), 'price': i.get('price', 0),
                            'description': i.get('desc', ''), 'image': i.get('image', None), 'category': 'main'
                        })
                    elif isinstance(i, str):
                         formatted_menu.append({'id': str(datetime.now().timestamp()), 'name': i, 'price': 0, 'category': 'main'})
                except: continue

        return jsonify({
            'success': True,
            'vendor': {
                'id': vendor.id, 'name': vendor.business_name, 'image': vendor.storefront_image_url,
                'address': loc.address, 'menuItems': formatted_menu,
                'categories': [{'id': 'all', 'name': 'All', 'count': len(formatted_menu)}]
            }
        }), 200
    except Exception as e:
        return jsonify({'error': 'Server Error'}), 500

@bp.route('/nearby', methods=['GET'])
def get_nearby_vendors():
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        rad = float(request.args.get('radius', 5000)) / 1000
    except: return jsonify({'error': 'Invalid params'}), 400

    cutoff = datetime.utcnow() - timedelta(hours=3)
    vendors = VendorLocation.query.filter(VendorLocation.created_at >= cutoff).all()
    results = []
    for v in vendors:
        dist = haversine_distance(lat, lon, v.latitude, v.longitude)
        if dist <= rad:
            results.append({
                'id': v.id, 'latitude': v.latitude, 'longitude': v.longitude,
                'distance': round(dist * 1000, 2), 'menu': v.menu_items
            })
    return jsonify({'success': True, 'vendors': results}), 200

@bp.route('/vendors', methods=['GET'])
def get_vendors():
    cutoff = datetime.utcnow() - timedelta(hours=3)
    locations = VendorLocation.query.filter(VendorLocation.created_at >= cutoff).all()
    data = []
    for loc in locations:
        if loc.vendor:
            data.append({
                'id': loc.vendor.id, 'name': loc.vendor.business_name,
                'image': loc.vendor.storefront_image_url, 'status': 'Open' if loc.is_open else 'Closed',
                'menu_items': loc.menu_items
            })
    return jsonify({'vendors': data})

@bp.route('/pay', methods=['POST'])
def initiate_payment():
    return jsonify({'success': True, 'message': 'STK Push initiated'}), 200