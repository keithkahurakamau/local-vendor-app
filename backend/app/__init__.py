from flask import Flask
from app.config import config
from app.extensions import db, cors, jwt
import threading
import time
from datetime import datetime


def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    db.init_app(app)
    cors.init_app(app, origins=["http://localhost:5173"])
    jwt.init_app(app)
    
    from app.routes import customer_routes, admin_routes, auth_routes, vendor_routes
    
    app.register_blueprint(customer_routes.bp)
    app.register_blueprint(admin_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(vendor_routes.bp)
    
    with app.app_context():
        db.create_all()

        # Start background task for auto-closing inactive vendors
        def auto_close_inactive_vendors():
            while True:
                try:
                    with app.app_context():
                        from app.models import VendorLocation
                        now = datetime.utcnow()

                        # Find vendors whose auto_close_at time has passed
                        expired_locations = VendorLocation.query.filter(
                            VendorLocation.auto_close_at.isnot(None),
                            VendorLocation.auto_close_at <= now,
                            VendorLocation.is_open == True
                        ).all()

                        for location in expired_locations:
                            location.is_open = False
                            location.auto_close_at = None
                            location.updated_at = now
                            print(f"Auto-closed inactive vendor location: {location.vendor_id}")

                        if expired_locations:
                            db.session.commit()

                except Exception as e:
                    print(f"Error in auto-close task: {e}")

                # Check every 5 minutes
                time.sleep(300)

        # Start the background thread
        thread = threading.Thread(target=auto_close_inactive_vendors, daemon=True)
        thread.start()

    @app.route('/')
    def index():
        return {
            'message': 'Local Vendor API',
            'status': 'running'
        }

    return app
