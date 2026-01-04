from flask import Blueprint, request, jsonify
from app.utils.mpesa_handler import MpesaHandler

mpesa_bp = Blueprint("mpesa", __name__, url_prefix="/api/mpesa")


@mpesa_bp.route("/pay", methods=["POST"])
def pay():
    try:
        mpesa_handler = MpesaHandler()  # instantiate here, after env vars are loaded
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON payload"}), 400

        phone = data.get("phone")
        amount = data.get("amount")
        if not phone or not amount:
            return jsonify({"error": "Phone and amount required"}), 400

        response = mpesa_handler.initiate_stk_push(phone, amount)
        return jsonify(response), 200

    except RuntimeError as e:
        # Known M-Pesa errors
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print("Unexpected M-Pesa error:", e)
        return jsonify({"error": "Failed to process payment"}), 500


@mpesa_bp.route("/callback", methods=["POST"])
def callback():
    try:
        mpesa_handler = MpesaHandler()
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON payload"}), 400

        result = mpesa_handler.process_callback(data)
        # TODO: Save result to DB or update order status

        return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

    except Exception as e:
        print("Callback error:", e)
        return jsonify({"ResultCode": 1, "ResultDesc": "Failed"}), 500
