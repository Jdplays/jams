from flask import Blueprint, render_template, jsonify
from flask_security import roles_required, login_required, current_user

bp = Blueprint('main', __name__)

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

@bp.route('/admin')
@login_required
@roles_required('Admin')
def admin():
    return "This is the Admin page"


## API for AJAX requests ##
@bp.route('/api/current_user_info', methods=['get'])
@login_required
def current_user_info():
    if current_user.is_authenticated:
        user_roles = current_user.roles
        first_role = user_roles[0].name if user_roles else 'No Role'
        return jsonify({
            'user_name': current_user.get_display_name(),
            'user_role': first_role
        })
    return jsonify({'error': 'Unauthorized'}), 401