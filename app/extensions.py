from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_security import Security, SQLAlchemyUserDatastore
from .models import User, Role

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

user_datastore = SQLAlchemyUserDatastore(db, User, Role)
security = Security()