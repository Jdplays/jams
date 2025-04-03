import os
import sys
import threading
import base64
from dotenv import load_dotenv
from flask import Flask
from flask_security import Security, SQLAlchemyUserDatastore
from uuid import UUID, uuid4
import logging

from jams.extensions import db, migrate, login_manager, oauth, WSS
from jams.models import User, Role, APIKey
from jams.routes import routes_bp
from jams.seeder import preform_seed
from jams.forms.flask_security import CustomLoginForm, CustomRegisterForm
from jams.util import helper
from jams.integrations.oauth import setup_oauth
from jams.util.websocket_server import WebsocketServer
from jams.routes.error import not_found, server_error, forbidden
from jams.configuration import config_entry_exists, get_config_value, ConfigType, set_config_value
from jams.util.task_scheduler import TaskScheduler
from jams.util import attendee_auth
from jams.util.enums import APIKeyType

logger = logging.getLogger(__name__)
scheduler = None
hmac_secret = None

def create_app():
    app = Flask(__name__)
    load_dotenv()
    app.config['SECRET_KEY']= os.getenv('SECRET_KEY', 'jams_flask_secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://jams:jams@db:5432/jams-main')
    app.config["SECURITY_PASSWORD_SALT"] = os.environ.get( "SECURITY_PASSWORD_SALT", "ab3d3a0f6984c4f5hkao41509b097a7bd498e903f3c9b2eea667h16")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECURITY_REGISTERABLE"] = True
    app.config['SECURITY_POST_REGISTER_VIEW'] = '/private/dashboard'
    app.config['SECURITY_POST_LOGIN_VIEW'] = '/private/dashboard'
    app.config['SECURITY_PASSWORD_HASH'] = 'argon2'
    app.config["SECURITY_SEND_REGISTER_EMAIL"] = False
    app.config["SECURITY_TRACKABLE"] = True
    app.config["OAUTH_ENABLE"] = True

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    user_datastore = SQLAlchemyUserDatastore(db, User, Role)
    security = Security()

    app.register_blueprint(routes_bp)
    app.register_error_handler(404, not_found)
    app.register_error_handler(500, server_error)
    app.register_error_handler(403, forbidden)

    security.init_app(app, user_datastore, login_form=CustomLoginForm, register_form=CustomRegisterForm)

    # Define the context processor to register methods for use in templating
    @app.context_processor
    def utility_processor():
        return dict(user_has_access_to_page=helper.user_has_access_to_page, get_config_value=get_config_value, is_attendee_authenticated=attendee_auth.is_authenticated, current_attendee=attendee_auth.current_attendee)
        
    with app.app_context():
        # Create database tables
        db.create_all()

        # Only run prep app when the app is actually starting. Dont runn it when db migrate or shell is running
        if not ('db' in sys.argv or 'shell' in sys.argv):
            prep_app(app)
        

    return app

def seed_database(app):
    with app.app_context():
        preform_seed()

def get_app_version():
    version_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "VERSION")
    try:
        with open(version_file, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        return "Unknown"

def prep_app(app):
    # Store the version in the DB
    set_config_value(ConfigType.APP_VERSION, get_app_version())

    # Generate HMAC secret key if it doesnt already exist:
    if not config_entry_exists(ConfigType.HMAC_SECRET_KEY):
        key = os.urandom(64)
        secret = base64.urlsafe_b64encode(key).decode('utf-8')
        set_config_value(ConfigType.HMAC_SECRET_KEY, secret)

    global hmac_secret
    secret = get_config_value(ConfigType.HMAC_SECRET_KEY)
    if secret:
        hmac_secret = secret.encode('utf-8')

    setup_oauth()

    app_url =  os.getenv('APP_URL', 'http://127.0.0.1:5000')
    secure = app_url.startswith('https')

    set_config_value(ConfigType.APP_URL, app_url)

    if secure:
        set_config_value(ConfigType.HTTP_SCHEME, 'https')
    else:
        set_config_value(ConfigType.HTTP_SCHEME, 'http')
    
    # Setup the task scheduler
    global scheduler
    scheduler = TaskScheduler(app=app, interval=5, max_workers=4)
    scheduler_thread = threading.Thread(target=scheduler.run)
    scheduler_thread.daemon = True
    scheduler_thread.start()

    # Setup the websocket listener
    WSS.init_app(app)
    websocket_server_thread = threading.Thread(target=WSS.run)
    websocket_server_thread.daemon = True
    websocket_server_thread.start()