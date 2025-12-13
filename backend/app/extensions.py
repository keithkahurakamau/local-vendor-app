from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_cors import CORS


# Unbound extensions
db = SQLAlchemy()        # Database
jwt = JWTManager()       # JWT for authentication
migrate = Migrate()      # Database migrations
cors = CORS()            # Cross-Origin Resource Sharing
