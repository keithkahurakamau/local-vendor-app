from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token
from app.models import User
from app.extensions import db

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'User exists'}), 409
    
    user = User(
        username=data.get('email').split('@')[0],
        email=data.get('email'),
        phone_number=data.get('phone_number'),
        password_hash=generate_password_hash(data.get('password')),
        role=data.get('role'),
        business_name=data.get('business_name'),
        storefront_image_url=data.get('storefront_image_url')
    )
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({'success': True, 'token': token, 'user': {'id': user.id, 'role': user.role}}), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if user.role == 'vendor' and user.location:
        user.location.auto_close_at = None
        db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': {'id': user.id, 'role': user.role, 'name': user.business_name}}), 200