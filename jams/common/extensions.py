import os
import logging
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from flask_migrate import Migrate

try:
    from flask_login import LoginManager
    from authlib.integrations.flask_client import OAuth
except ImportError:
    LoginManager = None
    OAuth = None
try:
    from minio import Minio
    from minio.error import S3Error
    from minio.versioningconfig import VersioningConfig, ENABLED
except ImportError:
    Minio = None

try:
    import redis
except ImportError:
    redis = None

load_dotenv()

# Initialise client MinIO for object storage
def create_minio_client():
    if not Minio:
        raise RuntimeError('MinIO not available in this environment')
    return Minio(
        endpoint=os.getenv('MINIO_ENDPOINT', 'jams-minio:9000'),
        access_key=os.getenv('MINIO_USER', 'jams'),
        secret_key=os.getenv('MINIO_PASS', 'jamsminiopassword'),
        secure=os.getenv('MINIO_SECURE', False)
    )

def create_redis_client():
    if not redis:
        raise RuntimeError('MinIO not available in this environment')
    redis_url = os.getenv('REDIS_URL', 'jams-redis:6379')
    return redis.Redis.from_url(redis_url, decode_responses=True)

def create_bucket(minio_client, name, versioning=True):
    # Create the bucket if it doesn't already exist
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

# Shared across all apps
db = SQLAlchemy()
migrate = Migrate()
oauth = OAuth()
minio_client = create_minio_client()
redis_client = create_redis_client()

# Make sure required MinIO buckets exist
workshop_bucket = create_bucket(minio_client, 'jams-workshops', True)
user_data_bucket = create_bucket(minio_client, 'user-data', True)


# Dynamically created per app
def get_logger(name='app'):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Check if it already has handlers (to avoid duplicates)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(logging.INFO)  # <- ensure handler emits INFO
        formatter = logging.Formatter('%(asctime)s [%(name)s] %(levelname)s: %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger

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
