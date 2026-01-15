import os
from flask import Flask
import cloudinary
from app.config import config
from app.extensions import db, cors, jwt, migrate 

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # 1. Load config
    app.config.from_object(config[config_name])
    
    # 2. Initialize Extensions
    db.init_app(app)
    
    # Enable CORS for all domains (Crucial for frontend communication)
    # Allow only your React frontend to communicate
    cors.init_app(app, resources={r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
        "supports_credentials": True,
        "send_wildcard": False
    }})

    jwt.init_app(app)
    migrate.init_app(app, db)

    # Configure Cloudinary
    if app.config.get('CLOUDINARY_CLOUD_NAME'):
        cloudinary.config(
            cloud_name=app.config['CLOUDINARY_CLOUD_NAME'],
            api_key=app.config['CLOUDINARY_API_KEY'],
            api_secret=app.config['CLOUDINARY_API_SECRET']
        )
    
    # 3. Import Blueprints
    # Note: We import here to avoid circular dependency issues
    from app.routes import customer_routes, admin_routes, auth_routes, vendor_routes

    # 4. Register Blueprints (THIS WAS MISSING)
    app.register_blueprint(customer_routes.bp) 
    app.register_blueprint(admin_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(vendor_routes.bp)
    
    @app.route('/')
    def index():
        return {
            'message': 'Local Vendor API is running',
            'status': 'active'
        }

    return app