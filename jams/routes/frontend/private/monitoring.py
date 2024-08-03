# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe

url_prefix = '/private/monitoring'

bp = Blueprint('monitoring', __name__, url_prefix='monitoring')

@bp.route('/private_access_log')
@login_required
@role_based_access_control_fe
def private_access_log():
    return render_template(f'{url_prefix}/private_access_log.html')