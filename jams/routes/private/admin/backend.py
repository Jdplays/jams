# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify, abort
from flask_security import roles_required, login_required
from jams.models import db, User, Role, Event, EventLocation, EventTimeslot, Session
from jams.util import helper

bp = Blueprint('backend', __name__, url_prefix='/backend')

# URL PREFIX = /backend

#------------------------------------------ USER ------------------------------------------#

@bp.route('/users', methods=['GET'])
@login_required
@roles_required('Admin')
def get_users():
    users = helper.filter_model_by_query_and_properties(User, request.args, User.id)
    users_data_list = [user.to_dict() for user in users]
    return jsonify({'users': users_data_list})


@bp.route('/users/<field>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_users_field(field):
    users = helper.filter_model_by_query_and_properties(User, request.args, User.id)

    allowed_fields = list(User.query.first_or_404().to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    users_data_list = []
    for user in users:
        users_data_list.append({
            'id': user.id,
            field: getattr(user, field)
        })
    return jsonify({'users': users_data_list})


@bp.route('/users/<int:user_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    return jsonify(user.to_dict())

@bp.route('/users/<int:user_id>/<field>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_user_field(user_id, field):
    user = User.query.filter_by(id=user_id).first_or_404()
    allowed_fields = list(user.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    return jsonify({field: getattr(user, field)})


@bp.route('/users/<int:user_id>', methods=['PATCH'])
@login_required
@roles_required('Admin')
def edit_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    # Update each allowed field
    allowed_fields = list(user.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            setattr(user, field, value)
    
    db.session.commit()

    return jsonify({
        'message': 'User has be updated successfully',
        'user': user.to_dict()
    })


@bp.route('/users/<int:user_id>/add_roles', methods=['PATCH'])
@login_required
@roles_required('Admin')
def user_add_roles(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    role_ids = data.get('role_ids')
    if not role_ids:
        abort(400, description="No 'role_ids' provided")
    
    user.add_roles(role_ids)
    
    db.session.commit()

    return jsonify({
        'message': 'Roles have been successfully added to the user',
        'role_ids': user.role_ids
    })


@bp.route('/users/<int:user_id>/remove_roles', methods=['PATCH'])
@login_required
@roles_required('Admin')
def user_remove_roles(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    role_ids = data.get('role_ids')
    if not role_ids:
        abort(400, description="No 'role_ids' provided")
    
    user.remove_roles(role_ids)
    
    db.session.commit()

    return jsonify({
        'message': 'Roles have been successfully removed from the user',
        'role_ids': user.role_ids
    })



@bp.route('/users/<int:user_id>/archive', methods=['POST'])
@login_required
@roles_required('Admin')
def archive_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    user.archive()
    db.session.commit()

    return jsonify({'message': 'The user has been successfully archived'})


@bp.route('/users/<int:user_id>/activate', methods=['POST'])
@login_required
@roles_required('Admin')
def activate_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    user.activate()
    db.session.commit()

    return jsonify({'message': 'The user has been successfully activated'})

#------------------------------------------ ROLE ------------------------------------------#

@bp.route('/roles', methods=['GET'])
@login_required
@roles_required('Admin')
def get_roles():
    roles = helper.filter_model_by_query_and_properties(Role, request.args, Role.id)
    roles_data_list = [role.to_dict() for role in roles]
    return jsonify({'roles': roles_data_list})


@bp.route('/roles/<field>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_roles_field(field):
    roles = helper.filter_model_by_query_and_properties(Role, request.args, Role.id)
    allowed_fields = list(Role.query.first_or_404().to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    roles_data_list = []
    for role in roles:
        roles_data_list.append({
            'id': role.id,
            field: getattr(role, field)
        })
    return jsonify({'roles': roles_data_list})


@bp.route('/roles/<int:role_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    return jsonify(role.to_dict())


@bp.route('/roles/<int:role_id>/<field>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_role_field(role_id, field):
    role = Role.query.filter_by(id=role_id).first_or_404()
    allowed_fields = list(role.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    return jsonify({field: getattr(role, field)})


@bp.route('/roles', methods=['POST'])
@login_required
@roles_required('Admin')
def add_role():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    name = data.get('name')
    description = data.get('description')

    if not name or not description:
        abort(400, description="No 'name' or 'description' provided")

    new_role = Role(name=name, description=description)
    db.session.add(new_role)
    db.session.commit()

    return jsonify({
        'message': 'New role has been successfully added',
        'role': new_role.to_dict()
    })


@bp.route('/roles/<int:role_id>', methods=['PATCH'])
@login_required
@roles_required('Admin')
def edit_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    # Update each allowed field
    allowed_fields = list(role.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            setattr(role, field, value)
    
    db.session.commit()

    return jsonify({
        'message': 'Role has be updated successfully',
        'user': role.to_dict()
    })


@bp.route('/roles/<int:role_id>', methods=['DELETE'])
@login_required
@roles_required('Admin')
def delete_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    
    if not helper.prep_delete_role(role):
        abort(500, description="An error occured when trying to remove role")

    db.session.remove(role)
    db.session.commit()

    return jsonify({'message': 'Role has be successfully removed'})
    

#------------------------------------------ EVENT ------------------------------------------#

@bp.route('/events', methods=['GET'])
@login_required
@roles_required('Admin')
def get_events():
    events_data_list = [event.to_dict() for event in Event.query.order_by(Event.id).all()]
    return jsonify({'events': events_data_list})


@bp.route('/events/<field>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_events_field(field):
    allowed_fields = list(Event.query.first_or_404().to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    events_data_list = []
    for event in Event.query.all():
        events_data_list.append({
            'id': event.id,
            field: getattr(event, field)
        })
    
    return jsonify({'events': events_data_list})


@bp.route('/events/<int:event_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    return jsonify(event.to_dict())


@bp.route('/events/<int:event_id>/<field>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_event_field(event_id, field):
    event = Event.query.filter_by(id=event_id).first_or_404()
    allowed_fields = list(event.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    return jsonify({field: getattr(event, field)})


@bp.route('/events', methods=['POST'])
@login_required
@roles_required('Admin')
def add_event():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    description = data.get('description')
    date = data.get('date')
    password = data.get('password')

    if not name or not description or not date or not password:
        abort(400, description="No 'name' or'description' or 'date' or 'password' provided")

    new_event = Event(name=name, description=description, date=date, password=password)
    db.session.add(new_event)
    db.session.commit()

    return jsonify({
        'message': 'New event has been successfully added',
        'role': new_event.to_dict()
    })


@bp.route('/events/<int:event_id>', methods=['PATCH'])
@login_required
@roles_required('Admin')
def edit_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(event.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            setattr(event, field, value)
    
    db.session.commit()

    return jsonify({
        'message': 'Event has be updated successfully',
        'user': event.to_dict()
    })


@bp.route('/events/<int:event_id>/archive', methods=['POST'])
@login_required
@roles_required('Admin')
def archive_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    event.archive()
    db.session.commit()

    return jsonify({'message': 'The event has been successfully archived'})


@bp.route('/events/<int:event_id>/activate', methods=['POST'])
@login_required
@roles_required('Admin')
def activate_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    event.activate()
    db.session.commit()

    return jsonify({'message': 'The event has been successfully activated'})

#------------------------------------------ EVENT LOCATION / TIMESLOT ------------------------------------------#

@bp.route('/events/<int:event_id>/locations', methods=['GET'])
@login_required
@roles_required('Admin')
def get_event_locations(event_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    
    ordered_event_locations = [location.to_dict() for location in helper.get_ordered_event_locations(event_id)]

    return jsonify({'event_locations': ordered_event_locations})


@bp.route('/events/<int:event_id>/timeslots', methods=['GET'])
@login_required
@roles_required('Admin')
def get_event_timeslots(event_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    
    ordered_event_timeslots = [timeslot.to_dict() for timeslot in helper.get_ordered_event_timeslots(event_id)]

    return jsonify({'event_timeslots': ordered_event_timeslots})


@bp.route('/events/<int:event_id>/locations', methods=['POST'])
@login_required
@roles_required('Admin')
def add_event_location(event_id):
    Event.query.filter_by(id=event_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    location_id = data.get('location_id')
    order = data.get('order')

    if not location_id or not order:
        abort(400, description="No 'location_id' or 'order' provided")

    # Make sure no other session in this event has the same location or order
    current_event_locations = helper.get_ordered_event_locations(event_id)
    
    for location in current_event_locations:
        if location.location_id == int(location_id):
            abort(400, description="Event already contains location")
        if location.order == int(order):
            abort(400, description="Event cannot have two locations with the same order")
    
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

    return jsonify({
        'message': 'Location has been added to the event',
        'event_location': event_location.to_dict()
                    
    })


@bp.route('/events/<int:event_id>/timeslots', methods=['POST'])
@login_required
@roles_required('Admin')
def add_event_timeslot(event_id):
    Event.query.filter_by(id=event_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    timeslot_id = data.get('timeslot_id')

    if not timeslot_id:
        abort(400, description="No 'timeslot_id' provided")

    # Make sure no other session in this event has the same location or order
    current_event_timeslots = helper.get_ordered_event_timeslots(event_id)
    
    for timeslot in current_event_timeslots:
        if timeslot.timeslot_id == int(timeslot_id):
            abort(400, description="Event already contains timeslot")
    
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

    return jsonify({
        'message': 'Timeslot has been added to the event',
        'event_timeslot': event_timeslot.to_dict()
    })
    

@bp.route('/events/<int:event_id>/locations/<int:event_location_id>/update_order', methods=['POST'])
@login_required
@roles_required('Admin')
def update_event_location_order(event_id, event_location_id):
    Event.query.filter_by(id=event_id).first_or_404()
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    order = data.get('order')

    if not order:
        abort(400, description="No'order' provided")

    # Check to see if updating this order will require a cascade update (ie: updating order 4 to be order 2 meaning the current order 2 needs to become 3 and 3 becomes 4)
    current_event_location_ids = [location.id for location in helper.get_ordered_event_locations(event_id)]
    
    updated_event_location_ids = helper.reorder_ids(current_event_location_ids, event_location_id, order)

    if current_event_location_ids == updated_event_location_ids:
        return 200, "No update needed"
    
    for new_order, location_id in updated_event_location_ids:
        location = EventLocation.query.filter_by(id=location_id).first()
        location.order = new_order
        db.session.commit()

    return jsonify({
        'event_locations': [location.id for location in helper.get_ordered_event_locations(event_id)]
    })


@bp.route('/events/<int:event_id>/locations/<int:event_location_id>', methods=['DELETE'])
@login_required
@roles_required('Admin')
def delete_event_location(event_id, event_location_id):
    Event.query.filter_by(id=event_id).first_or_404()
    event_location = EventLocation.query.filter_by(id=event_location_id).first_or_404()
    
    if not helper.prep_delete_event_location(event_location_id):
        abort(500, description="An error occured when trying to remove event_location")
    
    db.session.delete(event_location)
    db.session.commit()

    return jsonify({'message': "Event location has been successfully deleted"})


@bp.route('/events/<int:event_id>/timeslots/<int:event_timeslot_id>', methods=['DELETE'])
@login_required
@roles_required('Admin')
def delete_event_timeslot(event_id, event_timeslot_id):
    Event.query.filter_by(id=event_id).first_or_404()
    event_timeslot = EventTimeslot.query.filter_by(id=event_timeslot_id).first_or_404()


    if not helper.prep_delete_event_Timeslot(event_timeslot_id):
        abort(500, description="An error occured when trying to remove event_timeslot")
    
    db.session.delete(event_timeslot)
    db.session.commit()

    return jsonify({'message': "Event timeslot has been successfully deleted"})


@bp.route('/events/<int:event_id>/sessions', methods=['GET'])
@login_required
@roles_required('Admin')
def get_event_sessions(event_id):
    # Check if the event exists
    event = Event.query.filter_by(id=event_id).first_or_404()
    
    event_sessions = []
    for session in event.sessions:
        event_sessions.append(session.to_dict())

    return jsonify({'sessions': event_sessions})

#------------------------------------------ SESSION ------------------------------------------#


@bp.route('/sessions/<int:session_id>', methods=['GET'])
@login_required
@roles_required('Admin')
def get_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()
    return jsonify({
        'sessions': session.to_dict()
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['GET'])
@login_required
@roles_required('Admin')
def get_workshop_for_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()
    
    if not session.has_workshop:
        abort(400, description="Session has no workshop")

    workshop = session.workshop
    
    return jsonify({
        'workshop': workshop.to_dict()
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['POST'])
@login_required
@roles_required('Admin')
def add_workshop_to_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()

    if session.has_workshop:
        abort(400, description="Session already has a workshop")

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    workshop_id = data.get('workshop_id')

    if not workshop_id:
        abort(400, description="No 'workshop_id' provided")
    
    session.workshop_id = workshop_id
    db.session.commit()

    return jsonify({
        'message': 'Workshop successfully added to session'
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['DELETE'])
@login_required
@roles_required('Admin')
def remove_workshop_from_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()

    if not session.has_workshop:
        abort(400, description="Session has no workshop")
    
    session.workshop_id = None
    
    db.session.commit()

    return jsonify({'message': 'Workshop successfully removed from session'})