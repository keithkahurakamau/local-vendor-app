from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token
from app.models import User
from app.extensions import db
from sqlalchemy.exc import IntegrityError # Import this for error handling

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # 1. Validate Required Fields
    required_fields = ['email', 'password', 'phone_number', 'username']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    # 2. Check if Email already exists
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already registered'}), 409

    # 3. Check if Phone Number already exists (Prevents 500 Error)
    if User.query.filter_by(phone_number=data.get('phone_number')).first():
        return jsonify({'error': 'Phone number already registered'}), 409

    # 4. Check if Username already exists (Prevents 500 Error)
    # Use provided username, or fallback to email prefix if missing
    username = data.get('username') or data.get('email').split('@')[0]
    if User.query.filter_by(username=username).first():
        return jsonify({'error': f'Username "{username}" is taken. Please choose another.'}), 409
    
    try:
        user = User(
            username=username,
            email=data.get('email'),
            phone_number=data.get('phone_number'),
            password_hash=generate_password_hash(data.get('password')),
            role=data.get('role', 'customer'), # Default to customer if not specified
            business_name=data.get('business_name'),
            storefront_image_url=data.get('storefront_image_url')
        )
        
        db.session.add(user)
        db.session.commit()
        
        token = create_access_token(identity=str(user.id))
        return jsonify({
            'success': True, 
            'token': token, 
            'user': {'id': user.id, 'role': user.role, 'username': user.username}
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Database conflict: User already exists.'}), 409
    except Exception as e:
        db.session.rollback()
        print(f"Registration Error: {str(e)}") # Log error to terminal
        return jsonify({'error': 'Server error during registration.'}), 500

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # We do NOT reset location.auto_close_at here.
    # This preserves the vendor's "Live" status across logins.

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': {'id': user.id, 'role': user.role, 'name': user.business_name}}), 200