# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe

url_prefix='/private/admin'

bp = Blueprint('admin', __name__, url_prefix='admin')

# URL PREFIX = /admin

# Settings

@bp.route('/settings')
@login_required
@role_based_access_control_fe
def settings():
    return render_template(f'{url_prefix}/settings/settings-general.html')

@bp.route('/settings/eventbrite')
@login_required
@role_based_access_control_fe
def settings_eventbrite():
    return render_template(f'{url_prefix}/settings/settings-eventbrite.html')

@bp.route('/settings/roles')
@login_required
@role_based_access_control_fe
def settings_roles():
    return render_template(f'{url_prefix}/settings/settings-roles.html')

@bp.route('/settings/auth_sources')
@login_required
@role_based_access_control_fe
def settings_auth_sources():
    return render_template(f'{url_prefix}/settings/settings-auth_sources.html')

## Other

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

@bp.route('/schedule_planner')
@login_required
@role_based_access_control_fe
def schedule_planner():
    return render_template(f'{url_prefix}/schedule_planner.html')