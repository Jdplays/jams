from flask import Flask
from flask_security import Security, SQLAlchemyUserDatastore

from common.app_config import get_app_config
from common.extensions import LoginManager, db, migrate, oauth, minio_client, create_bucket
from common.configuration import get_config_value
from common import models

from web.routes import routes_bp
from web.forms.flask_security import CustomLoginForm, CustomRegisterForm
from web.integrations.oauth import setup_oauth
from web.routes.error import not_found, server_error, forbidden
from web.util import attendee_auth
from web.util.helper import user_has_access_to_page

app_type = 'web'

workshop_bucket = None
user_data_bucket = None

def create_app():
    app = Flask(__name__)
    app.config.from_object(get_app_config(app_type))

    db.init_app(app)
    migrate.init_app(app, db)

    login_manager = LoginManager()
    login_manager.init_app(app)
    oauth.init_app(app)

    user_datastore = SQLAlchemyUserDatastore(db, models.User, models.Role)
    security = Security()

    app.register_blueprint(routes_bp)
    app.register_error_handler(404, not_found)
    app.register_error_handler(500, server_error)
    app.register_error_handler(403, forbidden)

    security.init_app(app, user_datastore, login_form=CustomLoginForm, register_form=CustomRegisterForm)

    # Define the context processor to register methods for use in templating
    @app.context_processor
    def utility_processor():
        return dict(user_has_access_to_page=user_has_access_to_page, get_config_value=get_config_value, is_attendee_authenticated=attendee_auth.is_authenticated, current_attendee=attendee_auth.current_attendee)
        
    with app.app_context():
        # Create database tables
        db.create_all()

        # Create required buckets
        workshop_bucket = create_bucket(minio_client, 'jams-workshops', True)
        user_data_bucket = create_bucket(minio_client, 'user-data', True)

        setup_oauth()
        

    return app