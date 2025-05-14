# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import login_required

from web.util.decorators import role_based_access_control_fe

url_prefix = '/private/monitoring'

bp = Blueprint('monitoring', __name__, url_prefix='monitoring')

@bp.route('/logs')
@login_required
@role_based_access_control_fe
def logs():
    return render_template(f'{url_prefix}/logs.html')

@bp.route('/logs/private_access')
@login_required
@role_based_access_control_fe
def private_access_log():
    return render_template(f'{url_prefix}/private_access_log.html')

@bp.route('/logs/task_scheduler')
@login_required
@role_based_access_control_fe
def task_scheduler_log():
    return render_template(f'{url_prefix}/task_scheduler_log.html')

@bp.route('/logs/webhooks')
@login_required
@role_based_access_control_fe
def webhooks_log():
    return render_template(f'{url_prefix}/webhooks_log.html')

@bp.route('/logs/external_api')
@login_required
@role_based_access_control_fe
def external_api_log():
    return render_template(f'{url_prefix}/external_api_log.html')

@bp.route('/stats')
@login_required
@role_based_access_control_fe
def stats():
    return render_template(f'{url_prefix}/stats.html')