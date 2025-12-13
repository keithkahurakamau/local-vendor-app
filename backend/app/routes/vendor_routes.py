from flask import Blueprint, jsonify

vendor_bp = Blueprint('vendor', __name__)


@vendor_bp.route('/health')
def vendor_health():
	return jsonify({'status': 'ok', 'blueprint': 'vendor'})

