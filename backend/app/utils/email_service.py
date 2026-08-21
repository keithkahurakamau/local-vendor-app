from flask import current_app
from flask_mail import Message
from app.extensions import mail, db
import secrets
from datetime import datetime, timedelta

def send_reset_email(user):
    try:
        # 1. Generate Token
        token = secrets.token_urlsafe(32)
        
        # 2. Save to User Model
        user.reset_token = token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        
        # 3. Create Email Link (Points to Frontend)
        # Driven by FRONTEND_URL so reset mails are not hardcoded to a dev machine.
        frontend_url = (current_app.config.get('FRONTEND_URL') or 'http://localhost:5173').rstrip('/')
        reset_link = f"{frontend_url}/reset-password/{token}"
        
        msg = Message(
            subject="Password Reset Request - HyperLocal",
            recipients=[user.email],
            html=f"""
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #ea580c;">Password Reset Request</h2>
                    <p>Hello <strong>{user.username}</strong>,</p>
                    <p>We received a request to reset your password. Click the button below to proceed:</p>
                    <br>
                    <a href="{reset_link}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                    <br><br>
                    <p style="font-size: 12px; color: #777;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
                </div>
            """
        )
        
        # 4. Send
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email Error: {e}")
        return False