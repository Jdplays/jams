# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify
from flask_security import roles_required, login_required
from jams.models import db, User, Role, Event, EventLocation, EventTimeslot, Session, SessionWorkshop
from jams.util import helper

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
@roles_required('Admin')
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
@roles_required('Admin')
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
@roles_required('Admin')
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
@roles_required('Admin')
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
@roles_required('Admin')
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
@roles_required('Admin')
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

# Event schedule
@bp.route('/get_all_events', methods=['GET'])
@login_required
@roles_required('Admin')
def get_all_events_names():
    events = Event.query.all()
    events_data_list = []
    for event in events:
        events_data_list.append({
            'id': event.id,
            'name': event.name,
        })
    return jsonify({
        'events': events_data_list
    })

@bp.route('/get_locations_for_event/<int:event_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_event_locations(event_id):
    # Check if the event exists
    event = Event.query.filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"})
    
    ordered_event_locations = helper.get_ordered_event_locations(event_id)
    
    event_locations_list = []
    for location in ordered_event_locations:
        event_locations_list.append(location.to_dict())

    return jsonify({
        'event_locations': event_locations_list
    })

@bp.route('/get_timeslots_for_event/<int:event_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_event_timeslots(event_id):
    # Check if the event exists
    event = Event.query.filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"})
    
    ordered_event_timeslots = helper.get_ordered_event_timeslots(event_id)
    
    event_timeslots_list = []
    for timeslot in ordered_event_timeslots:
        event_timeslots_list.append(timeslot.to_dict())

    return jsonify({
        'event_timeslots': event_timeslots_list
    })

@bp.route('/get_sessions_for_event/<int:event_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_event_sessions(event_id):
    # Check if the event exists
    event = Event.query.filter_by(id=event_id).first()
    if not event:
        return jsonify({"error": "Event not found"})
    
    event_sessions_with_order = []
    for session in event.sessions:
        # Check if session is active
        if session.active:
            workshop_id = None
            if session.session_workshop:
                workshop_id = session.session_workshop.workshop.id
            event_sessions_with_order.append({
                'id': session.id,
                'event_location_id': session.event_location_id,
                'event_timeslot_id': session.event_timeslot_id,
                'workshop_id': workshop_id
            })

    return jsonify({
        'event_sessions': event_sessions_with_order
    })


@bp.route('/get_session/<int:session_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_session(session_id):
    session = Session.query.filter_by(id=session_id).first()
    if not session:
        return jsonify({"error": "Session not found"})
    
    return jsonify(session.to_dict())

@bp.route('/get_workshop_for_session/<int:session_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_workshop_for_session(session_id):
    session = Session.query.filter_by(id=session_id).first()
    if not session:
        return jsonify({"error": "Session not found"})
    
    session_workshop = session.session_workshop.workshop
    if not session_workshop:
        return jsonify({"error": "Session has no workshop"})
    
    return jsonify(session_workshop.to_dict())


@bp.route('/create_event_location', methods=['POST'])
@login_required
@roles_required('Admin')
def create_event_location():
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        location_id = data.get('location_id')
        order = data.get('order')

        event = Event.query.filter_by(id=event_id).first()
        if not event:
            return jsonify({"error": "Event not found"})

        # Make sure no other session in this event has the same location or order
        current_event_locations = helper.get_ordered_event_locations(event_id)
        
        for location in current_event_locations:
            if location.location_id == int(location_id):
                return jsonify({"error": "Event already contains location"})
            if location.order == int(order):
                return jsonify({"error": "Event cannot have two locations with the same order"})
        
        event_location = EventLocation(event_id=event_id, location_id=location_id, order=order)
        db.session.add(event_location)
        db.session.commit()

        # Create all the sessions for this location (over all the timeslots)
        for timeslot in helper.get_ordered_event_timeslots(event_id):
            # Make sure the session doesnt already exist
            if not helper.session_exists(event_location.id, timeslot.id):
                session = Session(event_id=event_id, event_location_id=event_location.id, event_timeslot_id=timeslot.id)
                db.session.add(session)

        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to add the location to the event'
        })

    return jsonify({
        'status': 'success',
        'message': 'Location has been added to the event'
    })


@bp.route('/create_event_timeslot', methods=['POST'])
@login_required
@roles_required('Admin')
def create_event_timeslot():
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        timeslot_id = data.get('timeslot_id')

        event = Event.query.filter_by(id=event_id).first()
        if not event:
            return jsonify({"error": "Event not found"})

        # Make sure no other session in this event has the same location or order
        current_event_timeslots = helper.get_ordered_event_timeslots(event_id)
        
        for timeslot in current_event_timeslots:
            if timeslot.timeslot_id == int(timeslot_id):
                return jsonify({"error": "Event already contains timeslot"})
        
        event_timeslot = EventTimeslot(event_id=event_id, timeslot_id=timeslot_id)
        db.session.add(event_timeslot)
        db.session.commit()

        # Create all the sessions for this timeslot (over all the locations)
        for location in helper.get_ordered_event_locations(event_id):
            # Make sure the session doesnt already exist
            if not helper.session_exists(location.id, event_timeslot.id):
                session = Session(event_id=event_id, event_location_id=location.id, event_timeslot_id=event_timeslot.id)
                db.session.add(session)

        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to add the timeslot to the event'
        })

    return jsonify({
        'status': 'success',
        'message': 'Timeslot has been added to the event'
    })

@bp.route('/add_workshop_to_session', methods=['POST'])
@login_required
@roles_required('Admin')
def add_workshop_to_session():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        workshop_id = data.get('workshop_id')

        # Check if session exists
        if not db.session.query(Session.query.filter_by(id=session_id).exists()).scalar():
            return jsonify({"error": "Session not found"})
        
        session_workshop = SessionWorkshop(session_id=session_id, workshop_id=workshop_id)
        db.session.add(session_workshop)
        db.session.commit()

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to add the workshop to session'
        })

    return jsonify({
        'status': 'success',
        'message': 'Workshop has been added to the session'
    })


# Update event_location
@bp.route('/update_event_location_order', methods=['POST'])
@login_required
@roles_required('Admin')
def update_event_location_order():
    try:
        data = request.get_json()
        target_id = data.get('event_location_id')
        order = data.get('event_location_order')

        # Check to see if updating this order will require a cascade update (ie: updating order 4 to be order 2 meaning the current order 2 needs to become 3 and 3 becomes 4)
        event = Session.query.filter_by(event_location_id=target_id).first().event
        ordered_event_locations = helper.get_ordered_event_locations(event.id)

        current_event_location_ids = []
        for location in ordered_event_locations:
            current_event_location_ids.append(location.id)
        
        updated_event_location_ids = helper.reorder_ids(current_event_location_ids, target_id, order)

        if current_event_location_ids == updated_event_location_ids:
            return jsonify({
                'status': 'warning',
                'message': 'No update needed'
            })
        
        for new_order, location_id in updated_event_location_ids:
            location = EventLocation.query.filter_by(id=location_id).first()
            location.order = new_order
            db.session.commit()

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to update event location\'s order'
        })

    return jsonify({
        'status': 'success',
        'message': 'Event Location\'s order has been updated'
    })


# Remove event_location / event_timeslot
@bp.route('/delete_event_location', methods=['POST'])
@login_required
@roles_required('Admin')
def delete_event_location():
    try:
        data = request.get_json()
        event_location_id = data.get('event_location_id')
        
        event_location = EventLocation.query.filter_by(id=event_location_id).first()
        
        helper.prep_delete_event_location(event_location_id)
        
        db.session.delete(event_location)
        db.session.commit()

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to delete event location'
        })

    return jsonify({
        'status': 'success',
        'message': 'Event Location has been deleted'
    })

@bp.route('/delete_event_timeslot', methods=['POST'])
@login_required
@roles_required('Admin')
def delete_event_timeslot():
    try:
        data = request.get_json()
        event_timeslot_id = data.get('event_timeslot_id')
        
        event_timeslot = EventTimeslot.query.filter_by(id=event_timeslot_id).first()
        helper.prep_delete_event_Timeslot(event_timeslot_id)
        
        db.session.delete(event_timeslot)
        db.session.commit()

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to delete event timeslot'
        })

    return jsonify({
        'status': 'success',
        'message': 'Event Timeslot has been deleted'
    })

# Remove workshop from session
@bp.route('/remove_worshop_from_session', methods=['POST'])
@login_required
@roles_required('Admin')
def remove_workshop_from_session():
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        session_workshop = SessionWorkshop.query.filter_by(session_id=session_id).first()
        
        db.session.delete(session_workshop)
        db.session.commit()

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to remove workshop from session'
        })

    return jsonify({
        'status': 'success',
        'message': 'Workshop has been removed from session'
    })
