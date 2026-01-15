from app import create_app, db
from app.models import User  # Make sure this import path matches your project structure
from werkzeug.security import generate_password_hash

# Initialize the Flask app context
app = create_app()

def seed_admin():
    with app.app_context():
        print("Checking for existing admin...")
        
        # 1. Check if an admin already exists to prevent duplicates
        existing_user = User.query.filter_by(email='admin@hyperlocal.com').first()
        
        if existing_user:
            print("⚠️  Admin user already exists.")
            return

        # 2. Create the Admin User object
        # We assume specific fields based on your previous logs (business_name, etc.)
        admin = User(
            username='SuperAdmin',
            email='admin@hyperlocal.com',
            phone_number='254712345678',  # Placeholder format
            password_hash=generate_password_hash('Admin@2026'),  # Hashing the password
            role='admin',
            
            # These fields are likely required by your model but irrelevant for Admin
            business_name='HyperLocal HQ', 
            owner_name='System Administrator',
            storefront_image_url=None
        )

        # 3. Add and Commit to DB
        try:
            db.session.add(admin)
            db.session.commit()
            print("✅ Admin user created successfully!")
            print("-----------------------------------")
            print("📧 Email:    admin@hyperlocal.com")
            print("🔑 Password: Admin@2026")
            print("-----------------------------------")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Failed to seed admin: {str(e)}")

if __name__ == '__main__':
    seed_admin()