# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import roles_required, login_required

url_prefix = '/private/management'

bp = Blueprint('frontend', __name__, url_prefix=url_prefix)

# URL PREFIX = /management

@bp.route('/workshop_catalog')
@login_required
@roles_required('Volunteer')
def workshop_catalog():
    return render_template(f'{url_prefix}/workshop_catalog.html')

@bp.route('/locations_timeslots')
@login_required
@roles_required('Volunteer')
def locations_timeslots():
    return render_template(f'{url_prefix}/locations_timeslots.html')