from flask import Blueprint, render_template, send_file
from flask_security import login_required
from jams.decorators import role_based_access_control_fe
from jams.util import files
from jams.models import File
from uuid import UUID

url_prefix = '/resources'

bp = Blueprint('resources', __name__, url_prefix=url_prefix)

# URL PREFIX = /resources

@bp.route('/')
@login_required
@role_based_access_control_fe
def files_page():
    return render_template(f'{url_prefix}/files_test.html')

@bp.route('/<uuid:id>')
@login_required
def file(id):
    file = File.query.filter_by(id=id).first_or_404()
    file_data = files.get_file(bucket_name=files.workshop_bucket, file_name=file)

    file_name = file.name

    mime_type = 'application/octet-stream'  # Default MIME type
    if file_name.endswith('.txt'):
        mime_type = 'text/plain'
    elif file_name.endswith('.pdf'):
        mime_type = 'application/pdf'
    elif file_name.endswith('.jpg') or file_name.endswith('.jpeg'):
        mime_type = 'image/jpeg'
    elif file_name.endswith('.png'):
        mime_type = 'image/png'
    elif file_name.endswith('.mp4'):
        mime_type = 'video/mp4'
    elif file_name.endswith('.html'):
        mime_type = 'text/html'
        
    # Return the file as an inline response
    return send_file(
        file_data,
        mimetype=mime_type,
        as_attachment=False,  # This ensures the file is displayed inline
        download_name=file_name
    )