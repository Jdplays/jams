# Frontend is just for serving pages
from flask import Blueprint, abort, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe
from jams.models import Workshop, WorkshopFile

url_prefix = '/private/management'

bp = Blueprint('management', __name__, url_prefix='management')

# URL PREFIX = /private/management

# Workshops

@bp.route('/workshops')
@login_required
@role_based_access_control_fe
def workshops():
    return render_template(f'{url_prefix}/workshops/workshops.html')

@bp.route('/workshops/add')
@login_required
@role_based_access_control_fe
def add_workshop():
    return render_template(f'{url_prefix}/workshops/add_workshop.html')

@bp.route('/workshops/<int:workshop_id>/edit')
@login_required
@role_based_access_control_fe
def edit_workshop(workshop_id):
    Workshop.query.filter_by(id=workshop_id).first_or_404() # Make sure the workshop exists before rendering the template
    return render_template(f'{url_prefix}/workshops/edit_workshop.html')

@bp.route('/workshops/<int:workshop_id>/files/<string:file_uuid>/edit')
@login_required
@role_based_access_control_fe
def edit_workshop_file(workshop_id, file_uuid):
    # Check that the workshop file exists
    workshop_file = WorkshopFile.query.filter_by(file_id=file_uuid).first_or_404()
    if workshop_file.workshop_id != workshop_id:
        abort(400, description='Workshop file does not belong to requested workshop')
    return render_template(f'{url_prefix}/workshops/edit_workshop_file.html')

@bp.route('/locations_timeslots')
@login_required
@role_based_access_control_fe
def locations_timeslots():
    return render_template(f'{url_prefix}/locations_timeslots.html')