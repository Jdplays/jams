from flask_login import current_user
import io

from common.models import db, File, FileVersion
from common.extensions import minio_client as client
from common.extensions import workshop_bucket, user_data_bucket


def get_files_name_list(bucket_name):
    files = File.query.filter_by(bucket_name=bucket_name).all()
    return_obj = [file.to_dict() for file in files]
    return return_obj

def get_file(bucket_name, file_name, version_id):
    response = client.get_object(bucket_name=bucket_name, object_name=file_name, version_id=version_id)

    file_data = io.BytesIO(response.read())
    response.close()
    response.release_conn()
    
    return file_data

def get_file_at_version(bucket_name, file_name, version_id):
    response = client.get_object(bucket_name=bucket_name, object_name=file_name, version_id=version_id)
    
    file_data = io.BytesIO(response.read())
    response.close()
    response.release_conn()

    return file_data

def upload_file(bucket_name, file_name, file_data):
    response = client.put_object(bucket_name, file_name, file_data, length=-1, part_size=10*1024*1024)  # 10MB part size

    file_db_obj = File.query.filter_by(name=file_name).first()

    if not file_db_obj:
        file_db_obj = File(name=file_name, current_version_id=response.version_id, bucket_name=bucket_name)
        db.session.add(file_db_obj)
        db.session.commit()
    
    file_db_obj.current_version_id = response.version_id
    file_db_obj.user_id = current_user.id # Set the file owner

    file_version = FileVersion(file_id=file_db_obj.id, version_id=response.version_id)
    db.session.add(file_version)
    db.session.commit()
    
    return file_db_obj