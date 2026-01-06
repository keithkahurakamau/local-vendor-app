from flask import Flask
from app.config import config
# Import migrate from extensions, DO NOT create a new one here
from app.extensions import db, cors, jwt, migrate 
import threading
import time
from datetime import datetime

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # 1. Initialize Extensions
    db.init_app(app)
    cors.init_app(app, origins=["http://localhost:5173"])
    jwt.init_app(app)
    migrate.init_app(app, db)  # <--- This fixes "No such command 'db'"
    
    # 2. Register Blueprints
    from app.routes import customer_routes, admin_routes, auth_routes, vendor_routes
    app.register_blueprint(customer_routes.bp)
    app.register_blueprint(admin_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(vendor_routes.bp)
    
    # 3. Database Creation logic
    # NOTE: When using Flask-Migrate, usually you remove db.create_all() 
    # because 'flask db upgrade' handles table creation. 
    # Keeping it here is safe ONLY if you want to create tables 
    # that don't have migrations yet, but it's better to comment it out.
    # with app.app_context():
    #    db.create_all() 

    # 4. Background Tasks
    # (Moved to a helper function to keep create_app clean)
    start_background_tasks(app)

    @app.route('/')
    def index():
        return {
            'message': 'Local Vendor API',
            'status': 'running'
        }

    return app

def start_background_tasks(app):
    # Only start the thread if it's not already running (basic check)
    # Prevents duplicate threads during development reloader restarts
    if threading.active_count() > 2: 
        return

    def auto_close_inactive_vendors():
        with app.app_context():
            from app.models import VendorLocation
            while True:
                try:
                    now = datetime.utcnow()
                    expired_locations = VendorLocation.query.filter(
                        VendorLocation.auto_close_at.isnot(None),
                        VendorLocation.auto_close_at <= now,
                        VendorLocation.is_open == True
                    ).all()

                    if expired_locations:
                        for location in expired_locations:
                            location.is_open = False
                            location.auto_close_at = None
                            location.updated_at = now
                            print(f"Auto-closed vendor: {location.vendor_id}")
                        db.session.commit()
                except Exception as e:
                    print(f"Error in auto-close task: {e}")
                
                time.sleep(300)

    thread = threading.Thread(target=auto_close_inactive_vendors, daemon=True)
    thread.start()