from flask import Blueprint, request, jsonify
from app.models import VendorLocation, User
from app.utils.geospatial import haversine_distance
from datetime import datetime

bp = Blueprint('customer', __name__, url_prefix='/api/customer')

# --- 1. SEARCH VENDORS ---
@bp.route('/search', methods=['GET'])
def search_vendors():
    item = request.args.get('item', '').lower().strip()
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
    except: return jsonify({'error': 'Invalid params'}), 400

    # Filter: Active vendors only
    vendors = VendorLocation.query.filter(VendorLocation.auto_close_at > datetime.utcnow()).all()
    
    results = []
    print(f"--- SEARCH DEBUG: Found {len(vendors)} active vendors in DB ---")
    
    for v in vendors:
        # Distance Check
        dist = haversine_distance(lat, lon, v.latitude, v.longitude)
        print(f"Vendor {v.id}: Dist={dist:.2f}km (Limit: 5km)")
        
        if dist > 5.0:
            continue

        # Item Match Check
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
                'distance': round(dist, 2),
                'menu_items': v.menu_items,
                'name': v.vendor.business_name if v.vendor else "Unknown",
                'image': v.vendor.storefront_image_url if v.vendor else None,
                'status': 'Open'
            })
            
    return jsonify({'success': True, 'vendors': results}), 200

# --- 2. GET NEARBY VENDORS (For Map) ---
@bp.route('/nearby', methods=['GET'])
def get_nearby_vendors():
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        rad = float(request.args.get('radius', 5000)) / 1000 # Convert to KM
    except: return jsonify({'error': 'Invalid params'}), 400

    # Filter: Active vendors only
    vendors = VendorLocation.query.filter(VendorLocation.auto_close_at > datetime.utcnow()).all()
    
    results = []
    print(f"\n--- MAP DEBUG: User at {lat}, {lon} (Rad: {rad}km) ---")
    
    for v in vendors:
        dist = haversine_distance(lat, lon, v.latitude, v.longitude)
        
        # PRINT DEBUG INFO TO TERMINAL
        print(f" -> Vendor {v.vendor_id} at {v.latitude}, {v.longitude} is {dist:.2f} km away.")
        
        if dist <= rad:
            results.append({
                'id': v.id, 
                'vendor_id': v.vendor_id,
                'latitude': v.latitude, 
                'longitude': v.longitude,
                'distance': round(dist * 1000, 2),
                'menu': v.menu_items,
                'name': v.vendor.business_name if v.vendor else "Unknown",
                'image': v.vendor.storefront_image_url if v.vendor else None,
                'status': 'Open',
                'updated': v.updated_at
            })
        else:
            print(f"    [SKIPPED] Too far (> {rad}km)")

    return jsonify({'success': True, 'vendors': results}), 200

# --- 3. GET VENDOR DETAILS ---
@bp.route('/vendor/<int:vendor_id>', methods=['GET'])
def get_vendor_details(vendor_id):
    try:
        vendor = User.query.filter_by(id=vendor_id, role='vendor').first()
        if not vendor or not vendor.location: return jsonify({'error': 'Not found'}), 404
        loc = vendor.location
        
        if loc.auto_close_at and loc.auto_close_at < datetime.utcnow(): 
            return jsonify({'error': 'Offline'}), 404

        # Format Menu
        raw_menu = loc.menu_items
        formatted_menu = []
        if raw_menu and isinstance(raw_menu, list):
            for i in raw_menu:
                try:
                    if isinstance(i, dict):
                        formatted_menu.append({
                            'id': i.get('id', str(datetime.now().timestamp())), 
                            'name': i.get('name', 'Unknown'), 
                            'price': i.get('price', 0),
                            'description': i.get('desc', ''), 
                            'image': i.get('image', None), 
                            'category': 'main'
                        })
                    elif isinstance(i, str):
                         formatted_menu.append({'id': str(datetime.now().timestamp()), 'name': i, 'price': 0, 'category': 'main'})
                except: continue

        return jsonify({
            'success': True,
            'vendor': {
                'id': vendor.id, 
                'name': vendor.business_name, 
                'image': vendor.storefront_image_url,
                'address': loc.address, 
                'menuItems': formatted_menu,
                'categories': [{'id': 'all', 'name': 'All', 'count': len(formatted_menu)}]
            }
        }), 200
    except Exception as e:
        return jsonify({'error': 'Server Error'}), 500

# --- 4. GET ALL VENDORS (Fallback) ---
@bp.route('/vendors', methods=['GET'])
def get_vendors():
    locations = VendorLocation.query.filter(VendorLocation.auto_close_at > datetime.utcnow()).all()
    data = []
    for loc in locations:
        if loc.vendor:
            data.append({
                'id': loc.vendor.id, 
                'name': loc.vendor.business_name,
                'image': loc.vendor.storefront_image_url, 
                'status': 'Open', 
                'menu_items': loc.menu_items
            })
    return jsonify({'vendors': data})

@bp.route('/pay', methods=['POST'])
def initiate_payment():
    return jsonify({'success': True, 'message': 'STK Push initiated'}), 200