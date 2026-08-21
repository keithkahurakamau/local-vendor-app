import os
from datetime import timedelta
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_key_change_in_prod')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt_key_change_in_prod')
    
    # Keep vendors logged in for 1 hour
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///dev.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # --- MVP 2: CLOUDINARY CONFIG ---
    CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET')

    # --- MVP 2: EMAIL SETTINGS (Gmail) ---
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME') # Add to .env
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD') # Add App Password to .env
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_USERNAME')

    # --- MVP 2: AI SETTINGS ---
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

    # --- CORS ---
    # Browser origins allowed to call the API. Credentials are enabled, so this must
    # never contain '*' - the wildcard cannot be combined with credentialed requests
    # and silently widens access to every site the user visits. The M-Pesa callback is
    # server-to-server and is not subject to CORS, so it needs no entry here.
    FRONTEND_URL = os.getenv('FRONTEND_URL')
    CORS_ORIGINS = [
        origin for origin in [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            os.getenv('FRONTEND_URL'),
        ] if origin
    ]

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_ECHO = False

class TestingConfig(Config):
    """
    Isolated config for the test suite.

    The database URI MUST be set here rather than patched onto app.config after
    create_app(): Flask-SQLAlchemy binds the engine during init_app(), so a later
    assignment is ignored and the tests would run (and drop_all) against the real
    DATABASE_URL from .env.
    """
    TESTING = True
    DEBUG = False
    SQLALCHEMY_ECHO = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret-key'
    # Never send real mail or hit real payment/AI providers from tests
    MAIL_SUPPRESS_SEND = True
    OPENAI_API_KEY = None

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}