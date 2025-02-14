# Frontend is just for serving pages
from flask import Blueprint, redirect, render_template, request, url_for
from flask_security import login_required, current_user
from datetime import datetime

from jams.decorators import role_based_access_control_fe

url_prefix = '/private'

bp = Blueprint('general', __name__)

# URL PREFIX = /private

@bp.route('/nav')
def nav():
    return render_template(f'{url_prefix}/nav.html', timestamp=int(datetime.utcnow().timestamp()))

@bp.route('/')
@bp.route('/dashboard')
@login_required
@role_based_access_control_fe
def dashboard():
    return render_template(f'{url_prefix}/dashboard.html')

@bp.route('/users/me')
@bp.route('/users/<int:user_id>')
@login_required
@role_based_access_control_fe
def user_profile(user_id=None):
    if user_id == current_user.id and request.path != url_for('routes.frontend.private.general.user_profile', user_id=None):
        return redirect(url_for('routes.frontend.private.general.user_profile', user_id=None))
    elif user_id is None:
        user_id = current_user.id
    is_current_user = (user_id == current_user.id)
    return render_template(f'{url_prefix}/user/profile.html', user_id=user_id, is_current_user=is_current_user)