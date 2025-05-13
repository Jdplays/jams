import os
import sys
import threading
import base64
from flask import Flask

from common.app_config import get_app_config
from common.extensions import db, migrate, minio_client, redis_client, create_bucket
from common.configuration import ConfigType, get_config_value, set_config_value, config_entry_exists
from common import models
from common.util.helper import get_app_version

from server.util.seeder import preform_seed
from server.TaskScheduler.task_scheduler import TaskScheduler
from server.WebSocketServer.websocket_server import WebsocketServer

app_type = 'server'
TS = TaskScheduler()
WSS = WebsocketServer()

def create_app():
    app = Flask(__name__)
    app.config.from_object(get_app_config(app_type))

    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        # Create database tables
        db.create_all()

        # Only run prep app when the app is actually starting. Dont run it when db migrate or shell is running
        if not ('db' in sys.argv or 'shell' in sys.argv):
            prep_app(app)

    return app

def seed_database(app):
    with app.app_context():
        preform_seed()

def prep_app(app):
    # Store the version in Redis
    current_app_version = get_app_version()
    redis_client.set('server:version', current_app_version)

    # Create the minio buckets

    # Generate HMAC secret key if it doesn't already exist:
    if not config_entry_exists(ConfigType.HMAC_SECRET_KEY):
        key = os.urandom(64)
        secret = base64.urlsafe_b64encode(key).decode('utf-8')
        set_config_value(ConfigType.HMAC_SECRET_KEY, secret)

    global hmac_secret
    secret = get_config_value(ConfigType.HMAC_SECRET_KEY)
    if secret:
        hmac_secret = secret.encode('utf-8')

    app_url =  os.getenv('APP_URL', 'http://127.0.0.1:5000')
    secure = app_url.startswith('https')

    set_config_value(ConfigType.APP_URL, app_url)

    if secure:
        set_config_value(ConfigType.HTTP_SCHEME, 'https')
    else:
        set_config_value(ConfigType.HTTP_SCHEME, 'http')

    # Make sure required MinIO buckets exist
    create_bucket(minio_client, 'jams-workshops', True)
    create_bucket(minio_client, 'user-data', True)
    
    # Setup the task scheduler
    TS.init_app(app)
    scheduler_thread = threading.Thread(target=TS.run)
    scheduler_thread.daemon = True
    scheduler_thread.start()

    # Setup the websocket listener
    WSS.init_app(app)
    websocket_server_thread = threading.Thread(target=WSS.run)
    websocket_server_thread.daemon = True
    websocket_server_thread.start()