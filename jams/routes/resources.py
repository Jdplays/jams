from flask import Blueprint, abort, render_template, send_file
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