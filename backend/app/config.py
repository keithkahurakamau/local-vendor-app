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

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_ECHO = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}