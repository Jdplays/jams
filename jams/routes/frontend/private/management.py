# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe
from jams.models import WorkshopFile

url_prefix = '/private/management'

bp = Blueprint('management', __name__, url_prefix='management')

# URL PREFIX = /private/management

@bp.route('/workshops')
@login_required
@role_based_access_control_fe
def workshop_catalog():
    return render_template(f'{url_prefix}/workshop_catalog.html')

@bp.route('/workshops/<int:workshop_id>/files/<uuid:file_id>')
@login_required
@role_based_access_control_fe
def edit_workshop_worksheet(workshop_id, file_id):
    WorkshopFile.query.filter_by(workshop_id=workshop_id, file_id=file_id).first_or_404()
    return render_template(f'{url_prefix}/edit_worksheet.html', workshop_id = workshop_id, file_id = file_id)

@bp.route('/locations_timeslots')
@login_required
@role_based_access_control_fe
def locations_timeslots():
    return render_template(f'{url_prefix}/locations_timeslots.html')