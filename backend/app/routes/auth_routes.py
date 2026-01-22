from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token
from app.models import User
from app.extensions import db
from sqlalchemy.exc import IntegrityError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
import random
from app.utils.email_service import send_reset_email

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    required_fields = ['email', 'password', 'phone_number', 'username']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already registered'}), 409

    if User.query.filter_by(phone_number=data.get('phone_number')).first():
        return jsonify({'error': 'Phone number already registered'}), 409

    username = data.get('username') or data.get('email').split('@')[0]
    if User.query.filter_by(username=username).first():
        return jsonify({'error': f'Username "{username}" is taken.'}), 409
    
    try:
        user = User(
            username=username,
            email=data.get('email'),
            phone_number=data.get('phone_number'),
            password_hash=generate_password_hash(data.get('password')),
            role=data.get('role', 'customer'),
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
        print(f"Registration Error: {str(e)}")
        return jsonify({'error': 'Server error during registration.'}), 500

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
        
    if user.password_hash and not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': {'id': user.id, 'role': user.role, 'name': user.business_name or user.username}}), 200

# --- MVP 2: GOOGLE LOGIN ---
@bp.route('/google-login', methods=['POST'])
def google_login():
    token = request.json.get('token')
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    
    try:
        id_info = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        email = id_info['email']
        name = id_info.get('name')
        picture = id_info.get('picture')
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Auto-register
            user = User(
                username=name.replace(" ", "_").lower() + "_" + str(random.randint(100,999)),
                email=email, 
                role=request.json.get('role', 'customer'),
                storefront_image_url=picture,
                is_verified=True,
                google_id=id_info.get('sub')
            )
            db.session.add(user)
            db.session.commit()
            
        access_token = create_access_token(identity=str(user.id))
        return jsonify({'token': access_token, 'user': user.to_dict()}), 200

    except ValueError:
        return jsonify({'error': 'Invalid Google Token'}), 401
    except Exception as e:
        print(f"Google Login Error: {e}")
        return jsonify({'error': 'Authentication failed'}), 500

# --- MVP 2: FORGOT PASSWORD ---
@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'message': 'If an account exists, a reset link has been sent.'}), 200
        
    if send_reset_email(user):
        return jsonify({'message': 'If an account exists, a reset link has been sent.'}), 200
    else:
        return jsonify({'error': 'Failed to send email'}), 500