import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file
# The .env file is located in the parent directory (backend/.env)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', '')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', '')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', '')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True

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