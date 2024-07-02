# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import roles_required, login_required

bp = Blueprint('frontend', __name__)

# URL PREFIX = /management

@bp.route('/workshop_catalog')
@login_required
@roles_required('Volunteer')
def workshop_catalog():
    return render_template('management/workshop_catalog.html')

@bp.route('/locations_timeslots')
@login_required
@roles_required('Volunteer')
def locations_timeslots():
    return render_template('management/locations_timeslots.html')