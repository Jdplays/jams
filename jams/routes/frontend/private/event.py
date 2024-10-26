# Frontend is just for serving pages
from flask import Blueprint, abort, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe
from jams.models import Workshop, WorkshopFile

url_prefix = '/private/event'

bp = Blueprint('event', __name__, url_prefix='event')

# URL PREFIX = /private/event

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