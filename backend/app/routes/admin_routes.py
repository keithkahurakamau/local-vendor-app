from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import VendorLocation, User, Transaction
from datetime import datetime, timedelta

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@bp.route('/vendors', methods=['GET'])
@jwt_required()
def get_all_vendors():
    """AD-01: Admin Map endpoint - Get all active vendors"""
    identity = get_jwt_identity()

    if identity['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    # Get vendors updated within last 3 hours
    three_hours_ago = datetime.utcnow() - timedelta(hours=3)
    vendor_locations = VendorLocation.query.filter(
        VendorLocation.updated_at >= three_hours_ago
    ).all()

    vendors = []
    for location in vendor_locations:
        vendor = location.vendor
        vendors.append({
            'id': vendor.id,
            'name': vendor.name,
            'email': vendor.email,
            'phone_number': vendor.phone_number,
            'latitude': location.latitude,
            'longitude': location.longitude,
            'menu_items': location.menu_items,
            'last_updated': location.updated_at.isoformat(),
            'status': vendor.status,
            'rating': vendor.rating,
            'cuisine': vendor.cuisine
        })

    return jsonify({
        'success': True,
        'vendors': vendors
    }), 200

@bp.route('/logs', methods=['GET'])
@jwt_required()
def get_transaction_logs():
    """AD-02: Admin Transaction Logs endpoint"""
    identity = get_jwt_identity()

    if identity['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    transactions = Transaction.query.order_by(Transaction.created_at.desc()).all()

    logs = []
    for transaction in transactions:
        vendor = transaction.vendor
        logs.append({
            'id': transaction.id,
            'vendor_name': vendor.name,
            'vendor_phone': vendor.phone_number,
            'customer_phone': transaction.customer_phone,
            'amount': transaction.amount,
            'mpesa_receipt_number': transaction.mpesa_receipt_number,
            'status': transaction.status,
            'created_at': transaction.created_at.isoformat(),
            'updated_at': transaction.updated_at.isoformat()
        })

    return jsonify({
        'success': True,
        'logs': logs
    }), 200
