
import os
from flask import Flask
from .extensions import db, migrate, login_manager
from .routes import routes
from .seeder import seed_roles, seed_users

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY']= os.getenv('SECRET_KEY', 'jams_database_secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://jams:jams@db:5432/jams-main')

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    login_manager.login_view = 'main.login'

    app.register_blueprint(routes.bp)

    # Create database tables
    with app.app_context():
        db.create_all()
        seed_roles()
        seed_users()

    return app