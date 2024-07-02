from flask import Blueprint, render_template, jsonify, request
from flask_security import roles_required, login_required, current_user
from .models import db, User, Role, Workshop

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

@bp.route('/management/workshop_catalog')
@login_required
@roles_required('Volunteer')
def workshop_catalog():
    return render_template('management/workshop_catalog.html')


## API for AJAX requests ##
@bp.route('/api/admin/get_user_management_table', methods=['GET'])
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

@bp.route('/api/admin/archive_user', methods=['POST'])
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

@bp.route('/api/admin/activate_user', methods=['POST'])
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


@bp.route('/api/management/get_workshop_catalog_table', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_workshop_catalog_table():
    workshops = Workshop.query.all()
    workshops_data_list = []
    for workshop in workshops:
        workshops_data_list.append({
            'id': workshop.id,
            'name': workshop.name,
            'description': workshop.description,
            'min_volunteers': workshop.min_volunteers,
            'active': workshop.active
        })
    return jsonify({
        'workshops': workshops_data_list
    })

@bp.route('/api/management/get_workshop_details/<int:workshop_id>', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first()
    return jsonify({
        'id': workshop.id,
        'name': workshop.name,
        'description': workshop.description,
        'min_volunteers': workshop.min_volunteers,
        'active': workshop.active
    })

@bp.route('/api/management/add_workshop', methods=['POST'])
@login_required
@roles_required('Volunteer')
def add_workshop():
    try:
        name = request.form.get('name')
        description = request.form.get('description')
        min_volunteers = request.form.get('min_volunteers')
        new_workshop = Workshop(name=name, description=description, min_volunteers=min_volunteers)
        db.session.add(new_workshop)
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to add new workshop'
        })

    return jsonify({
        'status': 'success',
        'message': 'New workshop has been added to the system'
    })

@bp.route('/api/management/edit_workshop', methods=['POST'])
@login_required
@roles_required('Volunteer')
def edit_workshop():
    try:
        data = request.get_json()
        workshop_id = data.get('workshop_id')
        name = data.get('name')
        description = data.get('description')
        min_volunteers = data.get('min_volunteers')
        workshop = Workshop.query.filter_by(id=workshop_id).first()
        workshop.name = name
        workshop.description = description
        workshop.min_volunteers = min_volunteers
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to edit workshop'
        })

    return jsonify({
        'status': 'success',
        'message': 'Workshop has been successfuly edited'
    })

@bp.route('/api/management/archive_workshop', methods=['POST'])
@login_required
@roles_required('Volunteer')
def archive_workshop():
    try:
        data = request.get_json()
        workshop_id = data.get('workshop_id')
        workshop = Workshop.query.filter_by(id=workshop_id).first()
        workshop.archive()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to archive workshop'
        })

    return jsonify({
        'status': 'success',
        'message': 'Workshop has been archived'
    })

@bp.route('/api/management/activate_workshop', methods=['POST'])
@login_required
@roles_required('Volunteer')
def activate_workshop():
    try:
        data = request.get_json()
        workshop_id = data.get('workshop_id')
        workshop = Workshop.query.filter_by(id=workshop_id).first()
        workshop.activate()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to activate workshop'
        })

    return jsonify({
        'status': 'success',
        'message': 'Workshop has been activated'
    })