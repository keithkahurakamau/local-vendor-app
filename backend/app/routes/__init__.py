import os
from flask import Flask
import cloudinary
from app.config import config
from app.extensions import db, cors, jwt, migrate 
from app.routes import customer_routes, admin_routes, auth_routes, vendor_routes

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # Load config
    app.config.from_object(config[config_name])
    
    # 1. Initialize Extensions
    db.init_app(app)
    
    # --- FIX: Use Wildcard CORS for Development ---
    # This allows all domains (localhost, 127.0.0.1) to access the API
    cors.init_app(app, resources={r"/*": {"origins": "*"}})
    
    jwt.init_app(app)
    migrate.init_app(app, db)

    # Configure Cloudinary
    if app.config.get('CLOUDINARY_CLOUD_NAME'):
        cloudinary.config(
            cloud_name=app.config['CLOUDINARY_CLOUD_NAME'],
            api_key=app.config['CLOUDINARY_API_KEY'],
            api_secret=app.config['CLOUDINARY_API_SECRET']
        )
    
    # 2. Register Blueprints
    app.register_blueprint(customer_routes.bp)
    app.register_blueprint(admin_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(vendor_routes.bp)
    
    @app.route('/')
    def index():
        return {
            'message': 'Local Vendor API',
            'status': 'running',
            'env': config_name
        }

    return app