# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import roles_required, login_required, current_user

bp = Blueprint('frontend', __name__, url_prefix='/private')

# URL PREFIX = /

@bp.route('/nav')
def nav():
    return render_template('nav.html', current_user=current_user)

@bp.route('/')
@bp.route('/index')
@login_required
def index():
    return render_template('index.html')

@bp.route('/volunteer')
@login_required
@roles_required('volunteer')
def volunteer():
    return "This is the Volunteer page"