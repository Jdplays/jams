from flask import Blueprint, render_template
from flask_security import roles_required, login_required

url_prefix = '/private/volunteer'

bp = Blueprint('frontend', __name__, url_prefix=url_prefix)

# URL PREFIX = /private/volunteer

@bp.route('/volunteer_attendance')
@login_required
@roles_required('Volunteer')
def volunteer_attendance():
    return render_template(f'{url_prefix}/volunteer_attendance.html')