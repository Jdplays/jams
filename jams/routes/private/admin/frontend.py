# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe

url_prefix='/private/admin'

bp = Blueprint('frontend', __name__, url_prefix=url_prefix)

# URL PREFIX = /admin

@bp.route('/settings')
@login_required
@role_based_access_control_fe
def settings():
    return render_template(f'{url_prefix}/settings.html')

@bp.route('/user_management')
@login_required
@role_based_access_control_fe
def user_management():
    return render_template(f'{url_prefix}/user_management.html')

@bp.route('/events')
@login_required
@role_based_access_control_fe
def events():
    return render_template(f'{url_prefix}/events.html')

@bp.route('/event_schedule')
@login_required
@role_based_access_control_fe
def event_schedule():
    return render_template(f'{url_prefix}/event_schedule.html')