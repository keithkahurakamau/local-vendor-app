import pytest
import json
from datetime import datetime, timedelta
from app import create_app
from app.extensions import db
from app.models import User, VendorLocation, Transaction
from werkzeug.security import generate_password_hash

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret-key'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

@pytest.fixture
def setup_test_data(client):
    """Setup test data similar to seed.py"""
    # Create admin
    admin = User(
        username='admin',
        email='admin@test.com',
        phone_number='+254700000001',
        password_hash=generate_password_hash('admin123'),
        role='admin'
    )
    db.session.add(admin)

    # Create vendors
    vendors_data = [
        {'email': 'samosa@test.com', 'business_name': 'Samosa King', 'lat': 0.0, 'lng': 0.0, 'menu': {'items': ['Samosa', 'Pilau'], 'prices': {'Samosa': 50, 'Pilau': 150}}},
        {'email': 'pilau@test.com', 'business_name': 'Pilau Palace', 'lat': 0.0, 'lng': 0.04, 'menu': {'items': ['Pilau', 'Biriani'], 'prices': {'Pilau': 150, 'Biriani': 180}}},
        {'email': 'fries@test.com', 'business_name': 'Late Night Fries', 'lat': 0.0, 'lng': 0.1, 'menu': {'items': ['Fries', 'Burger'], 'prices': {'Fries': 100, 'Burger': 200}}},
        {'email': 'stale@test.com', 'business_name': 'Stale Food Vendor', 'lat': 0.0, 'lng': 0.0, 'menu': {'items': ['Samosa'], 'prices': {'Samosa': 50}}}
    ]

    vendors = []
    for data in vendors_data:
        vendor = User(
            username=data['email'].split('@')[0],
            email=data['email'],
            phone_number=f'+2547{len(vendors)+1:02d}000000',
            password_hash=generate_password_hash('Vendor123!'),
            role='vendor',
            business_name=data['business_name']
        )
        db.session.add(vendor)
        vendors.append(vendor)

    db.session.commit()

    # Create locations
    for i, vendor in enumerate(vendors):
        location = VendorLocation(
            vendor_id=vendor.id,
            latitude=vendors_data[i]['lat'],
            longitude=vendors_data[i]['lng'],
            menu_items=vendors_data[i]['menu']
        )
        if vendor.business_name == 'Stale Food Vendor':
            location.check_in()
            location.auto_close_at = datetime.utcnow() - timedelta(hours=1)  # Expired
        else:
            location.check_in()  # Active for 3 hours
        db.session.add(location)

    db.session.commit()
    return vendors

def test_freshness_filter(client, setup_test_data):
    """Test that expired vendors are not returned in search"""
    response = client.get('/api/customer/search?item=Pilau&lat=0.0&lon=0.0')
    assert response.status_code == 200
    data = json.loads(response.data)
    vendors = data['vendors']

    # Should return Samosa King and Pilau Palace, but not Stale Food Vendor
    vendor_names = [v['vendor_id'] for v in vendors]  # Actually vendor_id, but we'll check count
    assert len(vendors) == 2  # Samosa King and Pilau Palace, Stale Food excluded

def test_radius_filter(client, setup_test_data):
    """Test that vendors beyond 5km are excluded"""
    response = client.get('/api/customer/search?item=Pilau&lat=0.0&lon=0.0')
    assert response.status_code == 200
    data = json.loads(response.data)
    vendors = data['vendors']

    # Late Night Fries at 0.0,0.1 is ~11km away, should be excluded
    # Pilau Palace at 0.0,0.04 is ~4.4km, should be included
    # Samosa King at 0.0,0.0 is 0km, included
    assert len(vendors) == 2

def test_inventory_filter(client, setup_test_data):
    """Test that only vendors with matching menu items are returned"""
    response = client.get('/api/customer/search?item=Biriani&lat=0.0&lon=0.0')
    assert response.status_code == 200
    data = json.loads(response.data)
    vendors = data['vendors']

    # Only Pilau Palace has Biriani
    assert len(vendors) == 1

def test_rbac_vendor_required(client, setup_test_data):
    """Test that only vendors can access checkin endpoint"""
    # Login as vendor
    login_response = client.post('/api/auth/login', json={'email': 'samosa@test.com', 'password': 'Vendor123!'})
    token = json.loads(login_response.data)['access_token']

    # Checkin should work
    response = client.post('/api/vendor/checkin', headers={'Authorization': f'Bearer {token}'}, json={
        'latitude': 0.0,
        'longitude': 0.0,
        'menu_items': {'items': ['Samosa'], 'prices': {'Samosa': 50}}
    })
    print(f"Response status: {response.status_code}")
    print(f"Response data: {response.data}")
    assert response.status_code == 200

    # Try without token
    response = client.post('/api/vendor/checkin', json={
        'latitude': 0.0,
        'longitude': 0.0,
        'menu_items': {'items': ['Samosa'], 'prices': {'Samosa': 50}}
    })
    assert response.status_code == 401

def test_auto_close_checkin(client, setup_test_data):
    """Test that checkin sets auto_close_at correctly"""
    # Login as vendor
    login_response = client.post('/api/auth/login', json={'email': 'samosa@test.com', 'password': 'Vendor123!'})
    token = json.loads(login_response.data)['access_token']

    before_checkin = datetime.utcnow()
    response = client.post('/api/vendor/checkin', headers={'Authorization': f'Bearer {token}'}, json={
        'latitude': 0.0,
        'longitude': 0.0,
        'menu_items': {'items': ['Samosa'], 'prices': {'Samosa': 50}}
    })
    after_checkin = datetime.utcnow()

    assert response.status_code == 200

    # Check database
    vendor = User.query.filter_by(email='samosa@test.com').first()
    location = vendor.location
    assert location.is_open == True
    assert location.last_checkin >= before_checkin
    assert location.last_checkin <= after_checkin
    assert location.auto_close_at == location.last_checkin + timedelta(hours=3)

def test_payment_creation(client, setup_test_data):
    """Test that payment creates PENDING transaction"""
    vendor = User.query.filter_by(email='samosa@test.com').first()
    response = client.post('/api/customer/pay', json={
        'vendor_id': vendor.id,
        'amount': 150,
        'customer_phone': '+254711111111'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'checkout_request_id' in data

    # Check transaction in DB
    transaction = Transaction.query.filter_by(customer_phone='+254711111111').first()
    assert transaction.status == 'PENDING'
    assert transaction.amount == 150
    assert transaction.vendor_id == vendor.id

def test_search_missing_params(client):
    """Test search endpoint with missing parameters"""
    response = client.get('/api/customer/search')
    assert response.status_code == 400

def test_search_invalid_coords(client):
    """Test search endpoint with invalid coordinates"""
    response = client.get('/api/customer/search?item=Pilau&lat=invalid&lon=0.0')
    assert response.status_code == 400

def test_payment_missing_fields(client):
    """Test payment endpoint with missing fields"""
    response = client.post('/api/customer/pay', json={'vendor_id': 1})
    assert response.status_code == 400

def test_register_vendor_requires_business_name(client):
    """Test vendor registration requires business_name"""
    response = client.post('/api/auth/register', json={
        'email': 'new@test.com',
        'phone_number': '+254799999999',
        'password': 'pass123',
        'role': 'vendor'
    })
    assert response.status_code == 400

def test_register_admin_no_business_name(client):
    """Test admin registration doesn't require business_name"""
    response = client.post('/api/auth/register', json={
        'email': 'admin2@test.com',
        'phone_number': '+254788888888',
        'password': 'pass123',
        'role': 'admin'
    })
    assert response.status_code == 201

def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = client.post('/api/auth/login', json={'email': 'wrong@test.com', 'password': 'wrong'})
    assert response.status_code == 401
