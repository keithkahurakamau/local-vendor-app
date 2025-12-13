from flask import Blueprint, request, jsonify
from app.models import VendorLocation, User

bp = Blueprint('customer', __name__, url_prefix='/api/customer')


@bp.route('/search', methods=['GET'])
def search_vendors():
    """B-R2 STUB: Search endpoint accepts item, lat, lon"""
    
    item = request.args.get('item', '')
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    
    if not item or lat is None or lon is None:
        return jsonify({'error': 'Missing parameters: item, lat, lon required'}), 400
    
    return jsonify({
        'success': True,
        'search_params': {'item': item, 'lat': lat, 'lon': lon},
        'vendors': []
    }), 200