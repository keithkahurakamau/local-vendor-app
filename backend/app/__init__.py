# backend/app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from app.config import config_by_name


# Extensions (Unbound)

db = SQLAlchemy()
jwt = JWTManager()


# Factory Function

def create_app(config_name='development'):
    """
    App factory: creates and configures the Flask app based on environment.
    
    Args:
        config_name (str): 'development', 'testing', or 'production'
    
    Returns:
        Flask app instance
    """
    app = Flask(__name__)

    # Load config from config.py (reads .env variables)
    app.config.from_object(config_by_name[config_name])

    # Enable CORS for cross-origin requests (frontend can call API)
    CORS(app)

    # Initialize extensions with the app
    db.init_app(app)
    jwt.init_app(app)

    
    # Register Blueprints
    
    from app.routes.auth_routes import auth_bp
    from app.routes.vendor_routes import vendor_bp
    from app.routes.customer_routes import customer_bp
    from app.routes.admin_routes import admin_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(vendor_bp, url_prefix='/vendor')
    app.register_blueprint(customer_bp, url_prefix='/customer')
    app.register_blueprint(admin_bp, url_prefix='/admin')

    
    # Optional: Health Check Route
    @app.route("/health")
    def health_check():
        return {"status": "ok", "env": config_name}, 200

    return app
