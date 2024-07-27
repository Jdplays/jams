# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe

url_prefix = '/private/management'

bp = Blueprint('management', __name__)

# URL PREFIX = /private/management

@bp.route('/workshop_catalog')
@login_required
@role_based_access_control_fe
def workshop_catalog():
    return render_template(f'{url_prefix}/workshop_catalog.html')

@bp.route('/locations_timeslots')
@login_required
@role_based_access_control_fe
def locations_timeslots():
    return render_template(f'{url_prefix}/locations_timeslots.html')