from flask import Flask
from app.config import config
from app.extensions import db, cors, jwt
from app.routes.mpesa_routes import mpesa_bp


def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    db.init_app(app)
    cors.init_app(app)
    jwt.init_app(app)
    
    from app.routes import customer_routes, admin_routes, auth_routes, vendor_routes
    
    app.register_blueprint(customer_routes.bp)
    app.register_blueprint(admin_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(vendor_routes.bp)
    app.register_blueprint(mpesa_bp)
    
    with app.app_context():
        db.create_all()
    
    @app.route('/')
    def index():
        return {
            'message': 'Local Vendor API',
            'status': 'running'
        }
    
    return app