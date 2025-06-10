from flask import Blueprint, render_template, request
from flask_security import login_required

from common.models import Event

from web.util.decorators import role_based_access_control_fe

url_prefix = '/private/volunteer'

bp = Blueprint('volunteer', __name__, url_prefix='volunteer')

# URL PREFIX = /private/volunteer

@bp.route('/attendance')
@login_required
@role_based_access_control_fe
def volunteer_attendance():
    args = request.args.to_dict()
    event_id = args.get('event_id', None)

    if event_id is not None:
        event = Event.query.filter_by(id=event_id).first()
        if event:
            return render_template(f'{url_prefix}/volunteer_attendance.html', event_id=event_id)
    
    return render_template(f'{url_prefix}/volunteer_attendance.html')

@bp.route('/signup')
@login_required
@role_based_access_control_fe
def volunteer_signup():
    args = request.args.to_dict()
    event_id = args.get('event_id', None)

    if event_id is not None:
        event = Event.query.filter_by(id=event_id).first()
        if event:
            return render_template(f'{url_prefix}/volunteer_signup.html', event_id=event_id)
    
    return render_template(f'{url_prefix}/volunteer_signup.html')