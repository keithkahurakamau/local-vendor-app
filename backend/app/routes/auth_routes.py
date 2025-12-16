from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token
from app.models import User

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(username=email, role='admin').first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    access_token = create_access_token(identity={'id': user.id, 'role': user.role})
    return jsonify({'access_token': access_token}), 200

@bp.route('/vendor/login', methods=['POST'])
def vendor_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(username=email, role='vendor').first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    access_token = create_access_token(identity={'id': user.id, 'role': user.role})
    return jsonify({'access_token': access_token}), 200
