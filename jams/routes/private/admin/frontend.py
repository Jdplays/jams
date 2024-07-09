# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import roles_required, login_required

url_prefix='/private/admin'

bp = Blueprint('frontend', __name__, url_prefix=url_prefix)

# URL PREFIX = /admin

@bp.route('/user_management')
@login_required
@roles_required('Admin')
def user_management():
    return render_template(f'{url_prefix}/user_management.html')

@bp.route('/events')
@login_required
@roles_required('Volunteer')
def events():
    return render_template(f'{url_prefix}/events.html')

@bp.route('/event_schedule')
@login_required
@roles_required('Volunteer')
def event_schedule():
    return render_template(f'{url_prefix}/event_schedule.html')