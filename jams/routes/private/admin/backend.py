# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify
from flask_security import roles_required, login_required
from jams.models import db, User, Role

bp = Blueprint('backend', __name__)

# URL PREFIX = /admin

@bp.route('/get_user_management_table', methods=['GET'])
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
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': full_name,
            'last_login': user.last_login_at,
            'roles': role_names,
            'active': user.active
        })
    return jsonify({
        'all_roles': all_roles,
        'users': users_data_list
    })

@bp.route('/archive_user', methods=['POST'])
@login_required
@roles_required('Admin')
def archive_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        user = User.query.filter_by(id=user_id).first()
        user.archive()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to archive user'
        })

    return jsonify({
        'status': 'success',
        'message': 'User has been archived'
    })

@bp.route('/activate_user', methods=['POST'])
@login_required
@roles_required('Admin')
def activate_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        user = User.query.filter_by(id=user_id).first()
        user.activate()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to activate user'
        })

    return jsonify({
        'status': 'success',
        'message': 'User has been activated'
    })