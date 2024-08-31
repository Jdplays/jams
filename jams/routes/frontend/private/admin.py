# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import login_required
from jams.decorators import role_based_access_control_fe
from jams.models import Event

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

# Events
@bp.route('/events')
@login_required
@role_based_access_control_fe
def events():
    return render_template(f'{url_prefix}/events/events.html')

@bp.route('/events/add')
@login_required
@role_based_access_control_fe
def add_event():
    return render_template(f'{url_prefix}/events/add_event.html')

@bp.route('/events/<int:event_id>/edit')
@login_required
@role_based_access_control_fe
def edit_event(event_id):
    Event.query.filter_by(id=event_id).first_or_404() # Make sure the event exists before rendering the template
    return render_template(f'{url_prefix}/events/edit_event.html')

## Other

@bp.route('/user_management')
@login_required
@role_based_access_control_fe
def user_management():
    return render_template(f'{url_prefix}/user_management.html')

@bp.route('/schedule_planner')
@login_required
@role_based_access_control_fe
def schedule_planner():
    return render_template(f'{url_prefix}/schedule_planner.html')