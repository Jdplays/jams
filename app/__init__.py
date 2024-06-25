
import os
from flask import Flask
from .extensions import db, migrate, login_manager
from flask_security import Security, SQLAlchemyUserDatastore
from .models import User, Role
from .routes import bp as routes_bp
from .seeder import seed_roles, seed_users

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY']= os.getenv('SECRET_KEY', 'jams_database_secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://jams:jams@db:5432/jams-main')
    app.config['SECURITY_USER_IDENTITY_ATTRIBUTES '] = 'username'

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    security = Security()

    security.init_app(app, user_datastore)

    login_manager.login_view = 'main.login'

    app.register_blueprint(routes_bp)

    # Create database tables
    with app.app_context():
        db.create_all()
        seed_roles()
        seed_users()

    return app