from flask import Blueprint, jsonify
from app.models import VendorLocation

bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@bp.route('/vendors', methods=['GET'])
def get_all_vendors():
    """AD-01 STUB: Admin Map endpoint"""
    
    return jsonify({
        'success': True,
        'vendors': []
    }), 200