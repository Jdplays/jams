# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify
from flask_security import roles_required, login_required
from jams.models import db, User, Role, Event

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

# Events
@bp.route('/get_events_table', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_events_table():
    events = Event.query.all()
    events_data_list = []
    for event in events:
        events_data_list.append({
            'id': event.id,
            'name': event.name,
            'description': event.description,
            'date': str(event.date),
            'password': event.password,
            'active': event.active
        })
    return jsonify({
        'events': events_data_list
    })

@bp.route('/get_event_details/<int:event_id>', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_event(event_id):
    event = Event.query.filter_by(id=event_id).first()
    return jsonify({
        'id': event.id,
        'name': event.name,
        'description': event.description,
        'date': str(event.date),
        'password': event.password,
        'active': event.active
    })

@bp.route('/add_event', methods=['POST'])
@login_required
@roles_required('Volunteer')
def add_event():
    try:
        name = request.form.get('name')
        description = request.form.get('description')
        date = request.form.get('date')
        password = request.form.get('password')
        new_event = Event(name=name, description=description, date=date, password=password)
        db.session.add(new_event)
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to add new event'
        })

    return jsonify({
        'status': 'success',
        'message': 'New event has been added to the system'
    })

@bp.route('/edit_event', methods=['POST'])
@login_required
@roles_required('Volunteer')
def edit_event():
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        name = data.get('name')
        description = data.get('description')
        date = data.get('date')
        password = data.get('password')
        event = Event.query.filter_by(id=event_id).first()
        event.name = name
        event.description = description
        event.date = date
        event.password = password
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to edit event'
        })

    return jsonify({
        'status': 'success',
        'message': 'Event has been successfuly edited'
    })

@bp.route('/archive_event', methods=['POST'])
@login_required
@roles_required('Volunteer')
def archive_event():
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        event = Event.query.filter_by(id=event_id).first()
        event.archive()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to archive event'
        })

    return jsonify({
        'status': 'success',
        'message': 'Event has been archived'
    })

@bp.route('/activate_event', methods=['POST'])
@login_required
@roles_required('Volunteer')
def activate_event():
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        event = Event.query.filter_by(id=event_id).first()
        event.activate()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to activate event'
        })

    return jsonify({
        'status': 'success',
        'message': 'Event has been activated'
    })