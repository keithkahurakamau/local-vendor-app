from app import create_app, db
from app.models import User  # Make sure this import path matches your project structure
from werkzeug.security import generate_password_hash
import os

# Bootstrap admin only. For a full dev dataset use seed_dev.py.
# Override in .env / the environment before running against anything real.
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@hyperlocal.com')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'Password123')

# Initialize the Flask app context
app = create_app()

def seed_admin():
    with app.app_context():
        print("Checking for existing admin...")
        
        # 1. Check if an admin already exists to prevent duplicates
        existing_user = User.query.filter_by(email=ADMIN_EMAIL).first()
        
        if existing_user:
            print("⚠️  Admin user already exists.")
            return

        # 2. Create the Admin User object
        # We assume specific fields based on your previous logs (business_name, etc.)
        admin = User(
            username='SuperAdmin',
            email=ADMIN_EMAIL,
            phone_number='254712345678',  # Placeholder format
            password_hash=generate_password_hash(ADMIN_PASSWORD),
            role='admin',
            business_name='HyperLocal HQ',
            storefront_image_url=None,
            is_verified=True
        )

        # 3. Add and Commit to DB
        try:
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created successfully!")
            print("-----------------------------------")
            print(f"📧 Email:    {ADMIN_EMAIL}")
            print(f"🔑 Password: {ADMIN_PASSWORD}  (set ADMIN_PASSWORD to override)")
            print("-----------------------------------")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Failed to seed admin: {str(e)}")

if __name__ == '__main__':
    seed_admin()