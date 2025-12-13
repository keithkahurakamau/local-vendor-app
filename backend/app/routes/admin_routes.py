from flask import Blueprint, jsonify

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/health')
def admin_health():
	return jsonify({'status': 'ok', 'blueprint': 'admin'})

