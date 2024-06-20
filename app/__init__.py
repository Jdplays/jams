
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'login'

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

    return app