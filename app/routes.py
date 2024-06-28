from flask import Blueprint, render_template, jsonify
from flask_security import roles_required, login_required, current_user
from .models import User, Role

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

@bp.route('/admin/user_management')
@login_required
@roles_required('Admin')
def user_management():
    return render_template('admin/user_management.html')


## API for AJAX requests ##
@bp.route('/api/admin/get_user_management_table', methods=['get'])
@login_required
@roles_required('Admin')
def get_user_management_table():
    users = User.query.all()
    users_data_list = []
    all_roles = [role.name for role in Role.query.all()]
    for user in users:
        full_name = user.get_full_name()
        role_names = user.get_role_names() if user.get_role_names else []
        users_data_list.append({
            'username': user.username,
            'email': user.email,
            'full_name': full_name,
            'last_login': user.last_login_at,
            'roles': role_names,
            'status': user.active
        })
    return jsonify({
        'all_roles': all_roles,
        'users': users_data_list
    })