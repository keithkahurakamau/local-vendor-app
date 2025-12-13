from flask import Blueprint, jsonify

customer_bp = Blueprint('customer', __name__)


@customer_bp.route('/health')
def customer_health():
	return jsonify({'status': 'ok', 'blueprint': 'customer'})

