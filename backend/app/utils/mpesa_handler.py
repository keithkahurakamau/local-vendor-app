import requests
import base64
from datetime import datetime
import os

class MpesaHandler:
    def __init__(self):
        self.consumer_key = os.getenv('MPESA_CONSUMER_KEY')
        self.consumer_secret = os.getenv('MPESA_CONSUMER_SECRET')
        self.shortcode = os.getenv('MPESA_SHORTCODE', '174379')  # Default sandbox shortcode
        self.passkey = os.getenv('MPESA_PASSKEY')
        self.base_url = 'https://sandbox.safaricom.co.ke'  # Use production URL for live

    def get_access_token(self):
        """Get M-Pesa access token"""
        auth = base64.b64encode(f"{self.consumer_key}:{self.consumer_secret}".encode()).decode()
        headers = {
            'Authorization': f'Basic {auth}',
            'Content-Type': 'application/json'
        }

        response = requests.get(f'{self.base_url}/oauth/v1/generate?grant_type=client_credentials', headers=headers)
        if response.status_code == 200:
            return response.json()['access_token']
        return None

    def initiate_stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """Initiate STK Push"""
        access_token = self.get_access_token()
        if not access_token:
            return {'error': 'Failed to get access token'}

        # Format phone number (remove + and ensure it starts with 254)
        if phone_number.startswith('+'):
            phone_number = phone_number[1:]
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]

        # Generate timestamp and password
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.shortcode}{self.passkey}{timestamp}".encode()).decode()

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerPayBillOnline',
            'Amount': amount,
            'PartyA': phone_number,
            'PartyB': self.shortcode,
            'PhoneNumber': phone_number,
            'CallBackURL': os.getenv('MPESA_CALLBACK_URL', 'https://your-callback-url.com/callback'),
            'AccountReference': account_reference,
            'TransactionDesc': transaction_desc
        }

        response = requests.post(f'{self.base_url}/mpesa/stkpush/v1/processrequest', json=payload, headers=headers)
        return response.json()

    def process_callback(self, callback_data):
        """Process M-Pesa callback"""
        # Extract relevant data from callback
        result_code = callback_data.get('Body', {}).get('stkCallback', {}).get('ResultCode')
        result_desc = callback_data.get('Body', {}).get('stkCallback', {}).get('ResultDesc')

        if result_code == 0:
            # Successful transaction
            callback_metadata = callback_data.get('Body', {}).get('stkCallback', {}).get('CallbackMetadata', {}).get('Item', [])

            transaction_data = {}
            for item in callback_metadata:
                name = item.get('Name')
                value = item.get('Value')
                transaction_data[name] = value

            return {
                'success': True,
                'receipt_number': transaction_data.get('MpesaReceiptNumber'),
                'amount': transaction_data.get('Amount'),
                'phone_number': transaction_data.get('PhoneNumber'),
                'transaction_date': transaction_data.get('TransactionDate')
            }
        else:
            # Failed transaction
            return {
                'success': False,
                'error_code': result_code,
                'error_description': result_desc
            }

# Global instance
mpesa_handler = MpesaHandler()
