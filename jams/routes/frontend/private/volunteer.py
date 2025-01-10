from flask import Blueprint, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe

url_prefix = '/private/volunteer'

bp = Blueprint('volunteer', __name__, url_prefix='volunteer')

# URL PREFIX = /private/volunteer

@bp.route('/attendance')
@login_required
@role_based_access_control_fe
def volunteer_attendance():
    return render_template(f'{url_prefix}/volunteer_attendance.html')

@bp.route('/signup')
@login_required
@role_based_access_control_fe
def volunteer_signup():
    return render_template(f'{url_prefix}/volunteer_signup.html')