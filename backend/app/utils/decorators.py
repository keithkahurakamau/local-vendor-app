from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import jsonify
from functools import wraps
from app.extensions import db
from app.models import User


def _current_user():
    """
    Resolve the JWT identity to a User.

    create_access_token() is called with str(user.id), so the identity comes back as
    a string and has to be cast before it can be used against an integer primary key.
    """
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    return db.session.get(User, user_id)


def _role_required(role, message):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = _current_user()
            if not user or user.role != role:
                return jsonify({'error': message}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


vendor_required = _role_required('vendor', 'Vendor access required')
admin_required = _role_required('admin', 'Admin access required')
