import os
import threading
import time
from datetime import datetime
from flask import Flask
from app.config import config
# Import migrate from extensions, DO NOT create a new one here
from app.extensions import db, cors, jwt, migrate 
from app.routes import customer_routes, admin_routes, auth_routes, vendor_routes

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # Load config (defaults to 'development' if not specified)
    app.config.from_object(config[config_name])
    
    # ------------------------------------------------------------
    # 1. Initialize Extensions with Production CORS
    # ------------------------------------------------------------
    db.init_app(app)
    
    # Get the frontend URL from Render Environment Variables, or default to localhost
    # On Render, set FRONTEND_URL to: https://your-frontend.vercel.app
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    
    cors.init_app(app, origins=[frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"], supports_credentials=True)
    
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # ------------------------------------------------------------
    # 2. Register Blueprints
    # ------------------------------------------------------------
    app.register_blueprint(customer_routes.bp)
    app.register_blueprint(admin_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(vendor_routes.bp)
    
    # ------------------------------------------------------------
    # 3. Database Creation logic
    # ------------------------------------------------------------
    # with app.app_context():
    #    db.create_all() 

    # ------------------------------------------------------------
    # 4. Background Tasks
    # ------------------------------------------------------------
    # We pass 'app' because the thread needs the application context
    start_background_tasks(app)

    @app.route('/')
    def index():
        return {
            'message': 'Local Vendor API',
            'status': 'running',
            'cors_allowed': frontend_url
        }

    return app

def start_background_tasks(app):
    """
    Starts a background thread to auto-close vendors.
    In Gunicorn, this runs once per Worker process.
    """
    def auto_close_inactive_vendors():
        # Create a new app context inside the thread
        with app.app_context():
            from app.models import VendorLocation
            
            print("Background Task: Started auto-close monitor.")
            
            while True:
                try:
                    now = datetime.utcnow()
                    # Find vendors that are OPEN and past their closing time
                    expired_locations = VendorLocation.query.filter(
                        VendorLocation.auto_close_at.isnot(None),
                        VendorLocation.auto_close_at <= now,
                        VendorLocation.is_open == True
                    ).all()

                    if expired_locations:
                        count = 0
                        for location in expired_locations:
                            location.is_open = False
                            location.auto_close_at = None
                            location.updated_at = now
                            count += 1
                        
                        db.session.commit()
                        print(f"Background Task: Auto-closed {count} vendors.")
                        
                except Exception as e:
                    print(f"Error in auto-close task: {e}")
                    # Rollback to prevent the connection from getting stuck in an error state
                    db.session.rollback()
                
                # Check every 5 minutes (300 seconds)
                time.sleep(300)

    # Daemon threads shut down automatically when the main process stops
    thread = threading.Thread(target=auto_close_inactive_vendors, daemon=True)
    thread.start()