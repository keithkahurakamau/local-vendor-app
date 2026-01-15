from flask import Blueprint, request, jsonify
from app.models import User, VendorLocation, Transaction
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity
from datetime import datetime

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# --- ADMIN LOGIN ---
@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email, role='admin').first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid admin credentials'}), 401

    token = create_access_token(identity=str(user.id), additional_claims={'role': 'admin'})
    
    return jsonify({
        'token': token, 
        'admin': {'id': user.id, 'username': user.username}
    }), 200

# --- GET ACTIVE VENDORS (AD-01) ---
@bp.route('/vendors', methods=['GET'])
@jwt_required()
def get_all_vendors():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        active_vendors = VendorLocation.query.filter(
            VendorLocation.auto_close_at > datetime.utcnow()
        ).all()

        vendors = []
        for loc in active_vendors:
            vendor = loc.vendor
            if vendor:
                time_left = loc.auto_close_at - datetime.utcnow()
                vendors.append({
                    'id': vendor.id,
                    'name': vendor.business_name or vendor.username,
                    'email': vendor.email,
                    'phone_number': vendor.phone_number,
                    'latitude': loc.latitude,
                    'longitude': loc.longitude,
                    'address': loc.address,
                    'status': 'Live',
                    'active_for_mins': int(time_left.total_seconds() / 60)
                })

        return jsonify({'success': True, 'vendors': vendors}), 200
    except Exception as e:
        print(f"Admin Vendors Error: {e}")
        return jsonify({'error': 'Server Error'}), 500

# --- GET TRANSACTION LOGS (AD-02) ---
@bp.route('/logs', methods=['GET'])
@jwt_required()
def get_transaction_logs():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        # 1. Fetch Real Transactions (Joined with Vendor for performance)
        # Ordered by newest first
        transactions = Transaction.query.order_by(Transaction.transaction_date.desc()).all()

        logs = []
        for t in transactions:
            
            # 2. Logic to enforce "Only Failed or Successful"
            raw_status = str(t.status).upper() if t.status else "FAILED"
            
            if raw_status in ['COMPLETED', 'SUCCESS', 'SUCCESSFUL'] or (t.mpesa_receipt_number and raw_status != 'FAILED'):
                display_status = "Successful"
            else:
                display_status = "Failed"

            # 3. Handle Missing Vendor Names gracefully
            vendor_name = "Unknown Vendor"
            if t.vendor:
                vendor_name = t.vendor.business_name if t.vendor.business_name else t.vendor.username

            # 4. Format Date (ISO format is best for React tables to sort/display)
            real_date = t.transaction_date if t.transaction_date else t.created_at
            formatted_date = real_date.isoformat() if real_date else datetime.utcnow().isoformat()

            # 5. NEW: Order ID Logic
            # Check relationship first, then raw ID, then fallback
            order_ref = "N/A"
            if t.order:
                order_ref = t.order.order_number  # e.g. "ORD-005"
            elif t.order_id:
                order_ref = f"#{t.order_id}"      # e.g. "#5"

            logs.append({
                'id': t.id,
                'vendor_id': t.vendor_id,
                'vendor_name': vendor_name,
                'timestamp': formatted_date,
                'amount': t.amount,
                'receipt': t.mpesa_receipt_number if t.mpesa_receipt_number else "N/A",
                'status': display_status,
                'customer_phone': t.customer_phone,
                # New Field added here
                'order_id': order_ref
            })

        return jsonify({'success': True, 'logs': logs}), 200
        
    except AttributeError as e:
        print(f"Admin Logs Error (Field Mismatch): {e}")
        return jsonify({'error': f"Database field error: {str(e)}"}), 500
    except Exception as e:
        print(f"Admin Logs Error: {str(e)}") 
        return jsonify({'error': 'Internal Server Error'}), 500