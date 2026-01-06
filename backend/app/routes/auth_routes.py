from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token
from app.models import User
from app.extensions import db
from datetime import datetime, timedelta

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    phone_number = data.get('phone_number')
    password = data.get('password')
    role = data.get('role')

    if not all([email, phone_number, password, role]):
        return jsonify({'error': 'Email, phone_number, password, and role required'}), 400

    if role not in ['vendor', 'admin']:
        return jsonify({'error': 'Invalid role'}), 400

    # If role is vendor, require business_name
    business_name = data.get('business_name')
    if role == 'vendor' and not business_name:
        return jsonify({'error': 'business_name required for vendors'}), 400

    # Check if user already exists
    existing_user = User.query.filter(
        (User.email == email) | (User.phone_number == phone_number)
    ).first()
    if existing_user:
        return jsonify({'error': 'User with this email or phone number already exists'}), 409

    # Create new user
    hashed_password = generate_password_hash(password)
    username = email.split('@')[0]  # Generate username from email
    new_user = User(
        username=username,
        email=email,
        phone_number=phone_number,
        password_hash=hashed_password,
        role=role,
        business_name=business_name
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'{role.capitalize()} registered successfully',
        'user_id': new_user.id
    }), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    # Reset the 3-hour timer for vendors when they login
    if user.role == 'vendor':
        from app.models import VendorLocation
        location = VendorLocation.query.filter_by(vendor_id=user.id).first()
        if location:
            # Reset the timer by setting auto_close_at to None
            # The timer will start when they become inactive
            location.auto_close_at = None
            location.updated_at = datetime.utcnow()
            db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token}), 200

@bp.route('/activity', methods=['POST'])
def update_activity():
    """Update user activity timestamp"""
    from flask_jwt_extended import get_jwt_identity
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        # Reset the 3-hour timer for active vendors
        if user and user.role == 'vendor':
            from app.models import VendorLocation
            location = VendorLocation.query.filter_by(vendor_id=user.id).first()
            if location and location.is_open:
                # Reset the timer since user is active
                location.auto_close_at = None
                location.updated_at = datetime.utcnow()
                db.session.commit()

        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': 'Invalid token'}), 401

@bp.route('/logout', methods=['POST'])
def logout():
    """Handle vendor logout and start 3-hour timer"""
    from flask_jwt_extended import get_jwt_identity
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        # Start the 3-hour timer for vendors when they logout
        if user and user.role == 'vendor':
            from app.models import VendorLocation
            location = VendorLocation.query.filter_by(vendor_id=user.id).first()
            if location and location.is_open:
                # Start the 3-hour timer
                location.auto_close_at = datetime.utcnow() + timedelta(hours=3)
                location.updated_at = datetime.utcnow()
                db.session.commit()

        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Invalid token'}), 401
