import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from flask_migrate import Migrate
from flask_login import LoginManager
from minio import Minio
from minio.error import S3Error
from minio.versioningconfig import VersioningConfig, ENABLED
from authlib.integrations.flask_client import OAuth
from jams.util.websocket_server import WebsocketServer

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
oauth = OAuth()
WSS = WebsocketServer()

# Initialise client MinIO for object storage
minio_client = Minio(
    endpoint=os.getenv('MINIO_ENDPOINT', 'jams-minio:9000'),
    access_key=os.getenv('MINIO_USER', 'jams'),
    secret_key=os.getenv('MINIO_PASS', 'jamsminiopassword'),
    secure=os.getenv('MINIO_SECURE', False)
)

def create_bucket(name, versioning=True):
    # Create the bucket if it doesnt already exist
    try:
        if not minio_client.bucket_exists(name):
            minio_client.make_bucket(name)
        if versioning:
            minio_client.set_bucket_versioning(name, VersioningConfig(ENABLED))
        print(f'\'{name}\' bucket successfully setup')
        return name
    except S3Error as e:
        print(f'An Error occurred when creating the bucket \'{name}\': {e}')
        return None
# Create required buckets
workshop_bucket = create_bucket('jams-workshops', True)
user_data_bucket = create_bucket('user-data', True)

def clear_table(model):
    if hasattr(db, 'engine'):
        engine = db.engine
    else:
        engine = db

    table_name = model.__tablename__
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            conn.execute(text(f'TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE'))
            print(f'Table: {table_name} reset')
            trans.commit()
        except SQLAlchemyError as e:
            trans.rollback()
            print(f"Error occurred: {e}")
            print('Rolling back DB')
