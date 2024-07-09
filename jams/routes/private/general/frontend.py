# Frontend is just for serving pages
from flask import Blueprint, render_template
from flask_security import roles_required, login_required, current_user

url_prefix = '/private'

bp = Blueprint('frontend', __name__, url_prefix=url_prefix)

# URL PREFIX = /private

@bp.route('/nav')
def nav():
    return render_template(f'{url_prefix}/nav.html', current_user=current_user)

@bp.route('/')
@bp.route('/dashboard')
@login_required
def dashboard():
    return render_template(f'{url_prefix}/dashboard.html')