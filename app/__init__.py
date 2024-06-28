
import os
from flask import Flask
from .extensions import db, migrate, login_manager
from flask_security import Security, SQLAlchemyUserDatastore
from .models import User, Role
from .routes import bp as routes_bp
from .seeder import preform_seed
from .forms.flask_security import CustomLoginForm, CustomRegisterForm

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY']= os.getenv('SECRET_KEY', 'jams_flask_secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://jams:jams@db:5432/jams-main')
    app.config["SECURITY_PASSWORD_SALT"] = os.environ.get( "SECURITY_PASSWORD_SALT", "ab3d3a0f6984c4f5hkao41509b097a7bd498e903f3c9b2eea667h16")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECURITY_REGISTERABLE"] = True
    app.config['SECURITY_PASSWORD_HASH'] = 'argon2'
    app.config["SECURITY_SEND_REGISTER_EMAIL"] = False
    app.config["SECURITY_TRACKABLE"] = True

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    security = Security()

    security.init_app(app, user_datastore, login_form=CustomLoginForm, register_form=CustomRegisterForm)

    app.register_blueprint(routes_bp)

    return app

def seed_database(app):
    # Create database tables
    with app.app_context():
        db.create_all()
        preform_seed()