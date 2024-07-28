from jams.extensions import minio_client as client
from jams.extensions import workshop_bucket
from jams.models import db, File
import io

def get_files_name_list(bucket_name):
    files = File.query.filter_by(bucket_name=bucket_name).all()
    return_obj = [file.to_dict() for file in files]
    return return_obj

def get_file(bucket_name, file_name):
    response = client.get_object(bucket_name=bucket_name, object_name=file_name.name)

    file_data = io.BytesIO(response.read())
    response.close()
    response.release_conn()
    
    return file_data

def get_file_version(bucket_name,version_id):
    response = client.get_object(bucket_name=bucket_name, object_name='workshops/minio_test_1.jpg', version_id=version_id)
    
    file_data = io.BytesIO(response.read())
    response.close()
    response.release_conn()

    return file_data

def upload_file(bucket_name, file_name, file_data):
    client.put_object(bucket_name, file_name, file_data, length=-1, part_size=10*1024*1024)  # 10MB part size

    file_db_obj = File.query.filter_by(name=file_name).first()

    if not file_db_obj:
        file_db_obj = File(name=file_name, bucket_name=bucket_name)
        db.session.add(file_db_obj)
        db.session.commit()
    
    return file_db_obj.id