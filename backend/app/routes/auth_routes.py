from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import User, VendorLocation
from app.extensions import db
from datetime import datetime, timedelta

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if data.get('role') == 'vendor' and not data.get('business_name'):
         return jsonify({'error': 'Business Name is required for vendors'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'User exists'}), 409

    hashed = generate_password_hash(data['password'])
    user = User(
        username=data['email'].split('@')[0], 
        email=data['email'], 
        phone_number=data['phone_number'],
        password_hash=hashed, 
        role=data['role'],
        business_name=data.get('business_name')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'success': True, 'user_id': user.id}), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()

    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'error': 'Invalid credentials'}), 401

    # Logic Fix: Extend timer on login if location exists
    if user.role == 'vendor':
        location = VendorLocation.query.filter_by(vendor_id=user.id).first()
        if location and location.is_open:
            location.auto_close_at = datetime.utcnow() + timedelta(hours=3)
            location.updated_at = datetime.utcnow()
            db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'access_token': access_token, 
        'role': user.role,
        'user': {'id': user.id, 'name': user.business_name or user.username}
    }), 200

@bp.route('/activity', methods=['POST'])
@jwt_required()
def update_activity():
    """Keep-Alive: Extends 3-hour window"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user and user.role == 'vendor':
        location = VendorLocation.query.filter_by(vendor_id=user.id).first()
        if location and location.is_open:
            location.auto_close_at = datetime.utcnow() + timedelta(hours=3)
            location.updated_at = datetime.utcnow()
            db.session.commit()
    return jsonify({'success': True}), 200

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user and user.role == 'vendor':
        location = VendorLocation.query.filter_by(vendor_id=user.id).first()
        if location:
            # Immediate close on logout
            location.is_open = False
            location.auto_close_at = None 
            db.session.commit()
    return jsonify({'success': True}), 200