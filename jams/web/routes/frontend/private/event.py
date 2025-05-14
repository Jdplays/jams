# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import login_required

from web.util.decorators import role_based_access_control_fe

url_prefix = '/private/event'

bp = Blueprint('event', __name__, url_prefix='event')

# URL PREFIX = /private/event

@bp.route('/schedule_planner')
@login_required
@role_based_access_control_fe
def schedule_planner():
    return render_template(f'{url_prefix}/schedule_planner.html')

@bp.route('/attendee_list')
@login_required
@role_based_access_control_fe
def attendee_list():
    return render_template(f'{url_prefix}/attendee_list.html')

@bp.route('/fire_list')
@login_required
@role_based_access_control_fe
def fire_list():
    return render_template(f'{url_prefix}/fire_list.html')