import os
import requests
import base64
from datetime import datetime
import json

class MpesaHandler:
    def __init__(self):
        self.consumer_key = os.getenv('MPESA_CONSUMER_KEY')
        self.consumer_secret = os.getenv('MPESA_CONSUMER_SECRET')
        self.shortcode = os.getenv('MPESA_SHORTCODE')
        self.passkey = os.getenv('MPESA_PASSKEY')
        self.base_url = 'https://sandbox.safaricom.co.ke'

    def get_access_token(self):
        url = f'{self.base_url}/oauth/v1/generate?grant_type=client_credentials'
        try:
            response = requests.get(url, auth=(self.consumer_key, self.consumer_secret))
            response.raise_for_status()
            return response.json()['access_token']
        except Exception as e:
            print(f"Error generating token: {e}")
            return None

    def initiate_stk_push(self, phone_number, amount, account_reference, transaction_desc):
        access_token = self.get_access_token()
        if not access_token:
            return {'ResponseCode': '1', 'errorMessage': 'Auth Failed'}

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f"{self.shortcode}{self.passkey}{timestamp}".encode()).decode('utf-8')
        
        phone_number = str(phone_number).replace('+', '').strip()
        if phone_number.startswith('0'): phone_number = '254' + phone_number[1:]

        headers = { 'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json' }
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": self.shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": os.getenv('MPESA_CALLBACK_URL'),
            "AccountReference": account_reference[:12],
            "TransactionDesc": transaction_desc[:12]
        }

        try:
            response = requests.post(f'{self.base_url}/mpesa/stkpush/v1/processrequest', json=payload, headers=headers)
            return response.json()
        except Exception as e:
            return {'errorMessage': str(e)}

    def process_callback(self, data):
        try:
            body = data.get('Body', {}).get('stkCallback', {})
            if body.get('ResultCode') == 0:
                meta = body.get('CallbackMetadata', {}).get('Item', [])
                return {
                    'success': True,
                    'receipt_number': next((i['Value'] for i in meta if i['Name'] == 'MpesaReceiptNumber'), None)
                }
            return {'success': False, 'error_description': body.get('ResultDesc')}
        except Exception as e:
            return {'success': False, 'error': str(e)}

mpesa_handler = MpesaHandler()