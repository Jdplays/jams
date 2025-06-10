import os
from dotenv import load_dotenv

load_dotenv()

class BaseConfig:
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'jams_flask_secret')

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://jams:jams@db:5432/jams-main')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 20,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800
    }
    SECURITY_PASSWORD_SALT = os.environ.get( "SECURITY_PASSWORD_SALT", "ab3d3a0f6984c4f5hkao41509b097a7bd498e903f3c9b2eea667h16")
    SECURITY_PASSWORD_HASH = 'argon2'
    SECURITY_REGISTERABLE = True
    SECURITY_TRACKABLE = True