from flask import Blueprint, jsonify, render_template, request
from flask_security import login_required

from common.models import File

from web.util.decorators import role_based_access_control_fe, api_route
from web.util import helper

url_prefix = '/resources'

bp = Blueprint('resources', __name__, url_prefix=url_prefix)

# URL PREFIX = /resources

@bp.route('/')
@login_required
@role_based_access_control_fe
def files_page():
    return render_template(f'{url_prefix}/files_test.html')

@bp.route('/files/<uuid:file_id>/versions', methods=['GET'])
@api_route
def get_file_versions(file_id):
    file = File.query.filter_by(id=file_id).first_or_404()
    return_obj = [file_version.to_dict() for file_version in file.versions]
    return jsonify({'file_versions': return_obj})

@bp.route('/files/<uuid:file_id>', methods=['GET'])
@api_route
def get_file(file_id):
    file = File.query.filter_by(id=file_id).first_or_404()
    if request.args:
        version_id = request.args.get('version_id')
        if version_id:
            return helper.get_and_prepare_file(file.bucket_name, file.name, version_id)
    return helper.get_and_prepare_file(file.bucket_name, file.name, file.current_version_id)