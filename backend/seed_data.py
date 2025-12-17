"""
Sample data seeding script for testing the map page
Run this to populate your database with test vendors

Usage: python seed_data.py
"""

from app import create_app
from app.extensions import db
from app.models import User, VendorLocation
from werkzeug.security import generate_password_hash
from datetime import datetime

def seed_test_data():
    app = create_app('development')
    
    with app.app_context():
        print(" Starting database seeding...")
        
        # Clear existing data
        VendorLocation.query.delete()
        User.query.filter_by(role='vendor').delete()
        db.session.commit()
        print(" Cleared existing vendor data")
        
        # Sample vendors in Nairobi area (adjust coordinates to your test location)
        vendors = [
            {
                'username': 'mama_njeri_kitchen',
                'phone': '+254712345678',
                'lat': -1.2864,  # Nairobi
                'lon': 36.8172,
                'menu': {
                    'items': ['Ugali', 'Sukuma Wiki', 'Beef Stew', 'Chapati', 'Rice'],
                    'prices': {
                        'Ugali': 50,
                        'Sukuma Wiki': 30,
                        'Beef Stew': 150,
                        'Chapati': 20,
                        'Rice': 60
                    }
                }
            },
            {
                'username': 'downtown_snacks',
                'phone': '+254723456789',
                'lat': -1.2921,
                'lon': 36.8219,
                'menu': {
                    'items': ['Samosa', 'Mandazi', 'Smokies', 'Chips', 'Sausage'],
                    'prices': {
                        'Samosa': 10,
                        'Mandazi': 10,
                        'Smokies': 20,
                        'Chips': 100,
                        'Sausage': 50
                    }
                }
            },
            {
                'username': 'joes_grill',
                'phone': '+254734567890',
                'lat': -1.2800,
                'lon': 36.8150,
                'menu': {
                    'items': ['Nyama Choma', 'Chicken', 'Pork Ribs', 'Kachumbari', 'Ugali'],
                    'prices': {
                        'Nyama Choma': 500,
                        'Chicken': 400,
                        'Pork Ribs': 600,
                        'Kachumbari': 50,
                        'Ugali': 50
                    }
                }
            },
            {
                'username': 'fresh_juices_co',
                'phone': '+254745678901',
                'lat': -1.2950,
                'lon': 36.8100,
                'menu': {
                    'items': ['Mango Juice', 'Passion Juice', 'Avocado Juice', 'Mixed Fruit', 'Smoothie'],
                    'prices': {
                        'Mango Juice': 80,
                        'Passion Juice': 100,
                        'Avocado Juice': 120,
                        'Mixed Fruit': 150,
                        'Smoothie': 200
                    }
                }
            },
            {
                'username': 'biryani_palace',
                'phone': '+254756789012',
                'lat': -1.2820,
                'lon': 36.8230,
                'menu': {
                    'items': ['Chicken Biryani', 'Beef Biryani', 'Pilau', 'Chapati', 'Kachumbari'],
                    'prices': {
                        'Chicken Biryani': 300,
                        'Beef Biryani': 350,
                        'Pilau': 200,
                        'Chapati': 20,
                        'Kachumbari': 50
                    }
                }
            }
        ]
        
        created_count = 0
        
        for vendor_data in vendors:
            try:
                # Create user
                user = User(
                    username=vendor_data['username'],
                    phone_number=vendor_data['phone'],
                    password_hash=generate_password_hash('password123'),  # Default password
                    role='vendor'
                )
                db.session.add(user)
                db.session.flush()  # Get the user ID
                
                # Create vendor location
                location = VendorLocation(
                    vendor_id=user.id,
                    latitude=vendor_data['lat'],
                    longitude=vendor_data['lon'],
                    menu_items=vendor_data['menu']
                )
                db.session.add(location)
                
                created_count += 1
                print(f" Created vendor: {vendor_data['username']}")
                
            except Exception as e:
                print(f" Error creating {vendor_data['username']}: {str(e)}")
                db.session.rollback()
                continue
        
        db.session.commit()
        print(f"\n Successfully seeded {created_count} vendors!")
        print("\n Test credentials (all vendors):")
        print("   Password: password123")
        print("\n  Vendors are located around Nairobi, Kenya")
        print("   Center: -1.2864, 36.8172")


if __name__ == '__main__':
    seed_test_data()