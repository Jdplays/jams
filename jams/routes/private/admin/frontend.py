# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import roles_required, login_required

bp = Blueprint('frontend', __name__)

# URL PREFIX = /admin

@bp.route('/user_management')
@login_required
@roles_required('Admin')
def user_management():
    return render_template('admin/user_management.html')

@bp.route('/events')
@login_required
@roles_required('Volunteer')
def events():
    return render_template('admin/events.html')