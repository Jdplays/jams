from flask import Blueprint, abort, jsonify, render_template, request, send_file
from flask_security import login_required
from jams.decorators import role_based_access_control_fe, role_based_access_control_be
from jams.util import files
from jams.models import File
from jams.util import helper

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
def get_file(id):
    file = File.query.filter_by(id=id).first_or_404()
    if not file.public:
        abort(403, description='You do not have access to the requested resource. It might be private.')
    return helper.get_and_prepare_file(files.workshop_bucket, file.name)

@bp.route('/files/<uuid:file_id>/versions', methods=['GET'])
@role_based_access_control_be
def get_file_versions(file_id):
    file = File.query.filter_by(id=file_id).first_or_404()
    return_obj = [file_version.to_dict() for file_version in file.versions]
    return jsonify({'file_versions': return_obj})

@bp.route('/files/<uuid:file_id>', methods=['GET'])
@role_based_access_control_be
def get_workshop_file(file_id):
    file = File.query.filter_by(id=file_id).first_or_404()
    if request.args:
        version_id = request.args.get('version_id')
        if version_id:
            return helper.get_and_prepare_file(files.workshop_bucket, file.name, version_id)
    return helper.get_and_prepare_file(files.workshop_bucket, file.name, file.current_version_id)