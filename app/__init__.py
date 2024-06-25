
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from . import Role, User

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'main.login'

def seed_roles():
    roles = ['Attendee', 'Volunteer', 'Trustee', 'Admin']
    for role_name in roles:
        role = Role.query.filter_by(role_name=role_name).first()
        if not role:
            new_role = Role(role_name)
            db.session.add(new_role)
    
    db.session.commit()

def seed_users():
    # Admin User
    db.session.add(User(username="admin", password="admin", role_name="Admin"))
    # Volunteer User
    db.session.add(User(username="volunteer", password="password123", role_name="Volunteer"))
    db.session.commit()

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY']= os.getenv('SECRET_KEY', 'jams_database_secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://jams:jams@db:5432/jams-main')

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    from . import routes, models
    app.register_blueprint(routes.bp)

    # Create database tables
    with app.app_context():
        db.create_all()
        seed_roles()
        seed_users()

    return app