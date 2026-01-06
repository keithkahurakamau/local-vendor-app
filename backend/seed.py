#!/usr/bin/env python3
"""
Database Seeding Script for Local Vendor App
Populates the database with comprehensive test data for development and testing
"""

import sys
import os
from datetime import datetime, timedelta
import random

# Add the current directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.extensions import db
from app.models import User, VendorLocation, Transaction, Order, MenuItem
from werkzeug.security import generate_password_hash

def create_app_context():
    """Create Flask app context for database operations"""
    app = create_app()
    app.app_context().push()
    return app

def clear_existing_data():
    """Clear all existing data from tables"""
    print("Clearing existing data...")
    MenuItem.query.delete()
    Order.query.delete()
    Transaction.query.delete()
    VendorLocation.query.delete()
    User.query.delete()
    db.session.commit()

def create_admin_users():
    """Create admin users"""
    print("Creating admin users...")
    admins = [
        {
            'username': 'system_admin',
            'email': 'admin@hyperlocal.com',
            'phone_number': '+254700000000',
            'password': 'Admin123!',
            'role': 'admin'
        },
        {
            'username': 'super_admin',
            'email': 'superadmin@hyperlocal.com',
            'phone_number': '+254700000001',
            'password': 'SuperAdmin123!',
            'role': 'admin'
        }
    ]

    admin_users = []
    for admin_data in admins:
        admin = User(
            username=admin_data['username'],
            email=admin_data['email'],
            phone_number=admin_data['phone_number'],
            password_hash=generate_password_hash(admin_data['password']),
            role=admin_data['role']
        )
        db.session.add(admin)
        admin_users.append(admin)

    db.session.commit()
    return admin_users

def create_vendor_users():
    """Create diverse vendor users for testing"""
    print("Creating vendor users...")

    vendors_data = [
        {
            'email': 'samosa@hyperlocal.com',
            'phone_number': '+254712345678',
            'password': 'Vendor123!',
            'business_name': 'Samosa King',
            'owner_name': 'John Doe',
            'cuisine': 'Indian Snacks'
        },
        {
            'email': 'pilau@hyperlocal.com',
            'phone_number': '+254723456789',
            'password': 'Vendor123!',
            'business_name': 'Pilau Palace',
            'owner_name': 'Jane Smith',
            'cuisine': 'Swahili Cuisine'
        },
        {
            'email': 'fries@hyperlocal.com',
            'phone_number': '+254734567890',
            'password': 'Vendor123!',
            'business_name': 'Late Night Fries',
            'owner_name': 'Bob Johnson',
            'cuisine': 'Fast Food'
        },
        {
            'email': 'stale@hyperlocal.com',
            'phone_number': '+254745678901',
            'password': 'Vendor123!',
            'business_name': 'Stale Food Vendor',
            'owner_name': 'Alice Brown',
            'cuisine': 'Mixed'
        },
        {
            'email': 'nyamachoma@hyperlocal.com',
            'phone_number': '+254756789012',
            'password': 'Vendor123!',
            'business_name': 'Nyama Choma Hub',
            'owner_name': 'David Wilson',
            'cuisine': 'Kenyan BBQ'
        },
        {
            'email': 'chapati@hyperlocal.com',
            'phone_number': '+254767890123',
            'password': 'Vendor123!',
            'business_name': 'Chapati Corner',
            'owner_name': 'Sarah Davis',
            'cuisine': 'East African'
        }
    ]

    vendor_users = []
    for vendor_data in vendors_data:
        vendor = User(
            username=vendor_data['email'].split('@')[0],  # Use email prefix as username
            email=vendor_data['email'],
            phone_number=vendor_data['phone_number'],
            password_hash=generate_password_hash(vendor_data['password']),
            role='vendor',
            business_name=vendor_data['business_name'],
            owner_name=vendor_data['owner_name']
        )
        db.session.add(vendor)
        vendor_users.append(vendor)

    db.session.commit()
    return vendor_users

def create_vendor_locations(vendor_users):
    """Create vendor locations with specific coordinates for testing"""
    print("Creating vendor locations...")

    # Specific locations in Nairobi area
    locations_data = [
        {'lat': -1.2864, 'lng': 36.8172, 'address': 'Nairobi CBD', 'menu': {'items': ['Beef Samosa', 'Chicken Samosa', 'Pakora', 'Chips Masala'], 'prices': {'Beef Samosa': 60, 'Chicken Samosa': 70, 'Pakora': 80, 'Chips Masala': 120}}},  # Samosa King
        {'lat': -1.2630, 'lng': 36.8065, 'address': 'Westlands', 'menu': {'items': ['Chicken Pilau', 'Beef Biriani', 'Plain Chapati', 'Kachumbari'], 'prices': {'Chicken Pilau': 180, 'Beef Biriani': 200, 'Plain Chapati': 50, 'Kachumbari': 30}}},  # Pilau Palace ~3km away
        {'lat': -1.3167, 'lng': 36.7833, 'address': 'Karen', 'menu': {'items': ['Large Fries', 'Chicken Burger', 'Fish & Chips', 'Onion Rings'], 'prices': {'Large Fries': 150, 'Chicken Burger': 250, 'Fish & Chips': 300, 'Onion Rings': 100}}},  # Late Night Fries ~6km away
        {'lat': -1.2864, 'lng': 36.8172, 'address': 'Nairobi CBD', 'menu': {'items': ['Beef Samosa', 'Chicken Pilau'], 'prices': {'Beef Samosa': 60, 'Chicken Pilau': 180}}},  # Stale Food (same location but expired)
        {'lat': -1.2921, 'lng': 36.8219, 'address': 'River Road', 'menu': {'items': ['Goat Nyama Choma', 'Beef Nyama Choma', 'Ugali', 'Mukimo'], 'prices': {'Goat Nyama Choma': 450, 'Beef Nyama Choma': 400, 'Ugali': 80, 'Mukimo': 100}}},  # Nyama Choma Hub ~1km from CBD
        {'lat': -1.2833, 'lng': 36.8167, 'address': 'Luthuli Avenue', 'menu': {'items': ['Plain Chapati', 'Beef Chapati', 'Chicken Chapati', 'Vegetable Chapati'], 'prices': {'Plain Chapati': 40, 'Beef Chapati': 120, 'Chicken Chapati': 150, 'Vegetable Chapati': 80}}}  # Chapati Corner ~500m from CBD
    ]

    for i, vendor in enumerate(vendor_users):
        location_data = locations_data[i]
        location = VendorLocation(
            vendor_id=vendor.id,
            latitude=location_data['lat'],
            longitude=location_data['lng'],
            menu_items=location_data['menu']
        )

        # For Stale Food vendor, set check-in 4 hours ago (expired)
        if vendor.business_name == 'Stale Food Vendor':
            location.check_in()
            location.last_checkin = datetime.utcnow() - timedelta(hours=4)
            location.auto_close_at = datetime.utcnow() - timedelta(hours=1)  # Already expired
        else:
            # For others, perform check-in to set auto_close_at
            location.check_in()

        db.session.add(location)

    db.session.commit()

def create_transactions(vendor_users):
    """Create sample transactions"""
    print("Creating sample transactions...")

    customer_phones = [
        '+254711111111', '+254722222222', '+254733333333', '+254744444444',
        '+254755555555', '+254766666666', '+254777777777', '+254788888888',
        '+254799999999', '+254700000002'
    ]

    statuses = ['COMPLETED', 'PENDING', 'FAILED']
    receipt_numbers = [f'MPESA{str(i).zfill(6)}' for i in range(1, 51)]  # Unique receipt numbers
    random.shuffle(receipt_numbers)  # Shuffle to randomize assignment
    receipt_index = 0

    transactions = []
    for _ in range(50):  # Create 50 transactions
        vendor = random.choice(vendor_users)
        customer_phone = random.choice(customer_phones)
        amount = random.randint(100, 1000)  # Random amount between 100-1000 KES
        status = random.choices(statuses, weights=[0.8, 0.15, 0.05])[0]  # 80% completed, 15% pending, 5% failed

        # Create transaction with random date within last 30 days
        days_ago = random.randint(0, 30)
        created_at = datetime.utcnow() - timedelta(days=days_ago)

        transaction = Transaction(
            vendor_id=vendor.id,
            customer_phone=customer_phone,
            amount=float(amount),
            status=status,
            created_at=created_at
        )

        # Add receipt number for completed transactions
        if status == 'COMPLETED':
            transaction.mpesa_receipt_number = receipt_numbers[receipt_index]
            receipt_index += 1

        db.session.add(transaction)
        transactions.append(transaction)

    db.session.commit()
    return transactions

def create_menu_items(vendor_users):
    """Create detailed menu items for each vendor"""
    print("Creating menu items...")

    menu_data = [
        # Samosa King
        [
            {'name': 'Beef Samosa', 'price': 60, 'image_url': '/images/samosa.jpg'},
            {'name': 'Chicken Samosa', 'price': 70, 'image_url': '/images/chicken_samosa.jpg'},
            {'name': 'Pakora', 'price': 80, 'image_url': '/images/pakora.jpg'},
            {'name': 'Chips Masala', 'price': 120, 'image_url': '/images/chips_masala.jpg'}
        ],
        # Pilau Palace
        [
            {'name': 'Chicken Pilau', 'price': 180, 'image_url': '/images/pilau.jpg'},
            {'name': 'Beef Biriani', 'price': 200, 'image_url': '/images/biriani.jpg'},
            {'name': 'Plain Chapati', 'price': 50, 'image_url': '/images/chapati.jpg'},
            {'name': 'Kachumbari', 'price': 30, 'image_url': '/images/kachumbari.jpg'}
        ],
        # Late Night Fries
        [
            {'name': 'Large Fries', 'price': 150, 'image_url': '/images/fries.jpg'},
            {'name': 'Chicken Burger', 'price': 250, 'image_url': '/images/burger.jpg'},
            {'name': 'Fish & Chips', 'price': 300, 'image_url': '/images/fish_chips.jpg'},
            {'name': 'Onion Rings', 'price': 100, 'image_url': '/images/onion_rings.jpg'}
        ],
        # Stale Food Vendor
        [
            {'name': 'Beef Samosa', 'price': 60, 'image_url': '/images/samosa.jpg'},
            {'name': 'Chicken Pilau', 'price': 180, 'image_url': '/images/pilau.jpg'}
        ],
        # Nyama Choma Hub
        [
            {'name': 'Goat Nyama Choma', 'price': 450, 'image_url': '/images/nyama_choma.jpg'},
            {'name': 'Beef Nyama Choma', 'price': 400, 'image_url': '/images/beef_nyama.jpg'},
            {'name': 'Ugali', 'price': 80, 'image_url': '/images/ugali.jpg'},
            {'name': 'Mukimo', 'price': 100, 'image_url': '/images/mukimo.jpg'}
        ],
        # Chapati Corner
        [
            {'name': 'Plain Chapati', 'price': 40, 'image_url': '/images/plain_chapati.jpg'},
            {'name': 'Beef Chapati', 'price': 120, 'image_url': '/images/beef_chapati.jpg'},
            {'name': 'Chicken Chapati', 'price': 150, 'image_url': '/images/chicken_chapati.jpg'},
            {'name': 'Vegetable Chapati', 'price': 80, 'image_url': '/images/veg_chapati.jpg'}
        ]
    ]

    menu_items = []
    for i, vendor in enumerate(vendor_users):
        for item_data in menu_data[i]:
            menu_item = MenuItem(
                vendor_id=vendor.id,
                name=item_data['name'],
                price=float(item_data['price']),
                image_url=item_data['image_url']
            )
            db.session.add(menu_item)
            menu_items.append(menu_item)

    db.session.commit()
    return menu_items

def create_orders(vendor_users):
    """Create sample orders linked to transactions"""
    print("Creating sample orders...")

    orders = []
    customer_phones = [
        '+254711111111', '+254722222222', '+254733333333', '+254744444444',
        '+254755555555', '+254766666666', '+254777777777', '+254788888888'
    ]

    # Get menu items for each vendor
    vendor_menus = {}
    for vendor in vendor_users:
        vendor_menus[vendor.id] = MenuItem.query.filter_by(vendor_id=vendor.id).all()

    for i in range(30):  # Create 30 orders
        vendor = random.choice(vendor_users)
        customer_phone = random.choice(customer_phones)

        # Generate unique order number
        order_number = f"ORD{str(1000 + i).zfill(4)}"

        # Select 1-3 random items from vendor's menu
        menu_items = vendor_menus[vendor.id]
        if menu_items:
            num_items = random.randint(1, min(3, len(menu_items)))
            selected_items = random.sample(menu_items, num_items)

            order_items = []
            total_amount = 0
            for item in selected_items:
                quantity = random.randint(1, 3)
                order_items.append({
                    'name': item.name,
                    'price': item.price,
                    'quantity': quantity,
                    'subtotal': item.price * quantity
                })
                total_amount += item.price * quantity

            order = Order(
                order_number=order_number,
                vendor_id=vendor.id,
                customer_phone=customer_phone,
                items=order_items,
                total_amount=float(total_amount),
                status=random.choice(['New Order', 'Paid', 'Completed', 'Cancelled'])
            )
            db.session.add(order)
            orders.append(order)

    db.session.commit()
    return orders

def main():
    """Main seeding function"""
    print("🌱 Starting database seeding...")

    try:
        app = create_app_context()

        # Clear existing data
        clear_existing_data()

        # Create users
        admin_users = create_admin_users()
        vendor_users = create_vendor_users()

        # Create locations
        create_vendor_locations(vendor_users)

        # Create menu items
        menu_items = create_menu_items(vendor_users)

        # Create orders
        orders = create_orders(vendor_users)

        # Create transactions
        transactions = create_transactions(vendor_users)

        print("✅ Database seeding completed successfully!")
        print(f"   📊 Created {len(admin_users)} admin users")
        print(f"   🏪 Created {len(vendor_users)} vendor users")
        print(f"   📍 Created {len(vendor_users)} vendor locations")
        print(f"   🍽️  Created {len(menu_items)} menu items")
        print(f"   📦 Created {len(orders)} orders")
        print(f"   💰 Created {len(transactions)} transactions")

        print("\n🔐 Admin Login Credentials:")
        print("   Email: admin@hyperlocal.com")
        print("   Password: Admin123!")
        print("   Email: superadmin@hyperlocal.com")
        print("   Password: SuperAdmin123!")

        print("\n🏪 Vendor Login Credentials:")
        print("   Email: nyamachoma@hyperlocal.com")
        print("   Password: Vendor123!")
        print("   (All vendors use the same password: Vendor123!)")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.session.rollback()
        sys.exit(1)

if __name__ == '__main__':
    main()
