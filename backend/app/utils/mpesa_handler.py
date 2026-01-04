import requests
import base64
from datetime import datetime
import os

class MpesaHandler:
    """Handles M-Pesa STK Push payments and callback processing."""

    def __init__(self):
        self.consumer_key = os.getenv("MPESA_CONSUMER_KEY")
        self.consumer_secret = os.getenv("MPESA_CONSUMER_SECRET")
        self.passkey = os.getenv("MPESA_PASSKEY")
        self.shortcode = os.getenv("MPESA_SHORTCODE", "174379")  # sandbox default
        self.callback_url = os.getenv("MPESA_CALLBACK_URL")
        self.base_url = os.getenv("MPESA_BASE_URL", "https://sandbox.safaricom.co.ke")

        if not all([self.consumer_key, self.consumer_secret, self.passkey, self.callback_url]):
            raise RuntimeError("Missing required M-Pesa environment variables")

    def get_access_token(self):
        """Generate M-Pesa access token"""
        auth = base64.b64encode(f"{self.consumer_key}:{self.consumer_secret}".encode()).decode()
        headers = {"Authorization": f"Basic {auth}"}

        try:
            response = requests.get(f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials", headers=headers, timeout=10)
            response.raise_for_status()
            return response.json().get("access_token")
        except requests.RequestException as e:
            print("Error getting access token:", e)
            raise RuntimeError("Failed to get M-Pesa access token")

    def initiate_stk_push(self, phone_number, amount, account_reference="ORDER_PAYMENT", transaction_desc="Order Payment"):
        """Initiate STK Push payment"""
        access_token = self.get_access_token()
        if not access_token:
            raise RuntimeError("Could not get access token")

        # Format phone number
        if phone_number.startswith("+"):
            phone_number = phone_number[1:]
        if phone_number.startswith("0"):
            phone_number = "254" + phone_number[1:]

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password = base64.b64encode(f"{self.shortcode}{self.passkey}{timestamp}".encode()).decode()

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone_number,
            "PartyB": self.shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": self.callback_url,
            "AccountReference": account_reference,
            "TransactionDesc": transaction_desc
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(f"{self.base_url}/mpesa/stkpush/v1/processrequest", json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print("Error initiating STK Push:", e)
            raise RuntimeError("Failed to initiate STK Push payment")

    def process_callback(self, callback_data):
        """Process M-Pesa callback"""
        try:
            stk_callback = callback_data.get("Body", {}).get("stkCallback", {})
            result_code = stk_callback.get("ResultCode")
            result_desc = stk_callback.get("ResultDesc")

            if result_code == 0:
                # Successful transaction
                items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
                transaction_data = {item.get("Name"): item.get("Value") for item in items}
                return {
                    "success": True,
                    "receipt_number": transaction_data.get("MpesaReceiptNumber"),
                    "amount": transaction_data.get("Amount"),
                    "phone_number": transaction_data.get("PhoneNumber"),
                    "transaction_date": transaction_data.get("TransactionDate")
                }
            else:
                return {"success": False, "error_code": result_code, "error_description": result_desc}
        except Exception as e:
            print("Error processing callback:", e)
            return {"success": False, "error": "Callback processing failed"}
