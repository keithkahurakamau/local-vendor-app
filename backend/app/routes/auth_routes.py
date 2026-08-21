from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models import User
from app.extensions import db
from sqlalchemy.exc import IntegrityError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os
from datetime import datetime
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


def _user_for_reset_token(token):
    """
    Resolve a reset token to its user.

    Returns (user, error_message). The token must exist and still be within its
    expiry window; both failure modes deliberately return the same generic message
    apart from expiry, which users need to be able to act on.
    """
    if not token:
        return None, 'Invalid or expired reset link.'

    user = User.query.filter_by(reset_token=token).first()
    if not user:
        return None, 'Invalid or expired reset link.'

    if not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        return None, 'This reset link has expired. Please request a new one.'

    return user, None


@bp.route('/reset-password/<token>', methods=['GET'])
def verify_reset_token(token):
    """Lets the frontend check a link before rendering the form."""
    user, error = _user_for_reset_token(token)
    if error:
        return jsonify({'error': error}), 400
    return jsonify({'success': True, 'email': user.email}), 200


@bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    user, error = _user_for_reset_token(token)
    if error:
        return jsonify({'error': error}), 400

    password = (request.get_json() or {}).get('password') or ''
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters.'}), 400

    user.password_hash = generate_password_hash(password)
    # Single use: clear the token so the same link cannot be replayed.
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()

    return jsonify({'success': True, 'message': 'Password updated. You can now log in.'}), 200

# ==========================================================================
# Account / profile
# ==========================================================================

def _me():
    try:
        return User.query.get(int(get_jwt_identity()))
    except (TypeError, ValueError):
        return None


def _profile_json(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'phone_number': user.phone_number,
        'role': user.role,
        'business_name': user.business_name,
        'image': user.storefront_image_url,
        'is_verified': user.is_verified,
        'has_password': bool(user.password_hash),
    }


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user = _me()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'success': True, 'user': _profile_json(user)}), 200


@bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    """
    Update identity fields for any role.

    username / email / phone_number are unique columns, so a clash must come back as
    a clear 409 rather than an IntegrityError 500. Vendors may also set their
    business fields here.
    """
    user = _me()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}

    # Check every uniqueness constraint before mutating anything.
    for field, label in (('username', 'Username'), ('email', 'Email'),
                         ('phone_number', 'Phone number')):
        if field not in data:
            continue
        value = str(data.get(field) or '').strip()
        if not value:
            return jsonify({'error': f'{label} cannot be empty.'}), 400
        clash = User.query.filter(getattr(User, field) == value, User.id != user.id).first()
        if clash:
            return jsonify({'error': f'{label} is already taken.'}), 409

    if 'username' in data:
        user.username = str(data['username']).strip()
    if 'email' in data:
        user.email = str(data['email']).strip()
    if 'phone_number' in data:
        user.phone_number = str(data['phone_number']).strip()

    if user.role == 'vendor':
        if 'business_name' in data:
            user.business_name = data['business_name']
        if 'storefront_image_url' in data:
            user.storefront_image_url = data['storefront_image_url']

    db.session.commit()
    return jsonify({'success': True, 'user': _profile_json(user)}), 200


@bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Change the caller's password.

    The current password is required: an unattended open session must not be enough
    to lock the real owner out. Google-only accounts have no password yet, so for
    them this sets one.
    """
    user = _me()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    new_password = data.get('new_password') or ''
    current_password = data.get('current_password') or ''

    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters.'}), 400

    if user.password_hash:
        if not current_password:
            return jsonify({'error': 'Your current password is required.'}), 400
        if not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Current password is incorrect.'}), 401

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Password updated.'}), 200
