# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify, abort
from flask_security import login_required, current_user
from jams.decorators import role_based_access_control_be, protect_user_updates
from jams.models import db, User, Role, Event, EventLocation, EventTimeslot, Session, Page, Config, Workshop
from jams.util import helper
from jams.rbac import generate_roles_file_from_db, update_pages_assigned_to_role

bp = Blueprint('admin', __name__)

# URL PREFIX = /backend

#------------------------------------------ USER ------------------------------------------#

@bp.route('/users', methods=['GET'])
@role_based_access_control_be
def get_users():
    users = helper.filter_model_by_query_and_properties(User, request.args)
    return jsonify(users)


@bp.route('/users/<field>', methods=['GET'])
@role_based_access_control_be
def get_users_field(field):
    users = helper.filter_model_by_query_and_properties(User, request.args, field)
    return jsonify(users)


@bp.route('/users/<int:user_id>', methods=['GET'])
@role_based_access_control_be
def get_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    return jsonify(user.to_dict())

@bp.route('/users/<int:user_id>/<field>', methods=['GET'])
@role_based_access_control_be
def get_user_field(user_id, field):
    user = User.query.filter_by(id=user_id).first_or_404()
    allowed_fields = list(user.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    return jsonify({field: getattr(user, field)})


@bp.route('/users/<int:user_id>', methods=['PATCH'])
@login_required
@protect_user_updates
@role_based_access_control_be
def edit_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    # Update each allowed field
    allowed_fields = list(user.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            if field == 'role_ids':
                if current_user.id == user_id:
                    abort(400, description='User cannot update their own roles')
                user.set_roles(value)
                continue
            setattr(user, field, value)
    
    db.session.commit()

    return jsonify({
        'message': 'User has be updated successfully',
        'user': user.to_dict()
    })



@bp.route('/users/<int:user_id>/archive', methods=['POST'])
@role_based_access_control_be
def archive_user(user_id):
    if current_user.id == user_id:
        abort(400, description='User cannot archive themself')
    user = User.query.filter_by(id=user_id).first_or_404()
    user.archive()
    db.session.commit()

    return jsonify({'message': 'The user has been successfully archived'})


@bp.route('/users/<int:user_id>/activate', methods=['POST'])
@role_based_access_control_be
def activate_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    user.activate()
    db.session.commit()

    return jsonify({'message': 'The user has been successfully activated'})

#------------------------------------------ ROLE ------------------------------------------#

@bp.route('/roles', methods=['GET'])
@role_based_access_control_be
def get_roles():
    roles = helper.filter_model_by_query_and_properties(Role, request.args)
    return jsonify(roles)


@bp.route('/roles/<field>', methods=['GET'])
@role_based_access_control_be
def get_roles_field(field):
    roles = helper.filter_model_by_query_and_properties(Role, request.args, field)
    return jsonify(roles)


@bp.route('/roles/<int:role_id>', methods=['GET'])
@role_based_access_control_be
def get_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    return jsonify(role.to_dict())


@bp.route('/roles/<int:role_id>/<field>', methods=['GET'])
@role_based_access_control_be
def get_role_field(role_id, field):
    role = Role.query.filter_by(id=role_id).first_or_404()
    allowed_fields = list(role.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    return jsonify({field: getattr(role, field)})


@bp.route('/roles', methods=['POST'])
@role_based_access_control_be
def add_role():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    name = data.get('name')
    description = data.get('description')
    page_ids = data.get('page_ids')

    if not name:
        abort(400, description="No 'name' provided")

    new_role = Role(name=name, description=description)
    db.session.add(new_role)
    db.session.commit()

    update_pages_assigned_to_role(new_role.id, page_ids)
    generate_roles_file_from_db()

    return jsonify({
        'message': 'New role has been successfully added',
        'role': new_role.to_dict()
    })


@bp.route('/roles/<int:role_id>', methods=['PATCH'])
@role_based_access_control_be
def edit_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    # Update each allowed field
    allowed_fields = list(role.to_dict().keys())
    for field, value in data.items():
        if field == 'name' and role.default:
            # If its a default role, you cannot rename it
            continue
        if field == 'page_ids':
            if getattr(role, field) != value:
                update_pages_assigned_to_role(role_id, value)
            continue
        if field in allowed_fields:
            setattr(role, field, value)
    
    db.session.commit()

    generate_roles_file_from_db()

    return jsonify({
        'message': 'Role has be updated successfully',
        'user': role.to_dict()
    })


@bp.route('/roles/<int:role_id>', methods=['DELETE'])
@role_based_access_control_be
def delete_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    
    if not helper.prep_delete_role(role):
        abort(500, description="An error occured when trying to remove role")

    db.session.delete(role)
    db.session.commit()

    generate_roles_file_from_db()

    return jsonify({'message': 'Role has be successfully removed'})
    

#------------------------------------------ EVENT ------------------------------------------#

@bp.route('/events', methods=['GET'])
@role_based_access_control_be
def get_events():
    data = helper.filter_model_by_query_and_properties(Event, request.args)
    return jsonify(data)


@bp.route('/events/<field>', methods=['GET'])
@role_based_access_control_be
def get_events_field(field):
    data = helper.filter_model_by_query_and_properties(Event, request.args, field)
    return jsonify(data)


@bp.route('/events/<int:event_id>', methods=['GET'])
@role_based_access_control_be
def get_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    return jsonify(event.to_dict())


@bp.route('/events/<int:event_id>/<field>', methods=['GET'])
@role_based_access_control_be
def get_event_field(event_id, field):
    event = Event.query.filter_by(id=event_id).first_or_404()
    allowed_fields = list(event.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    return jsonify({field: getattr(event, field)})


@bp.route('/events', methods=['POST'])
@role_based_access_control_be
def add_event():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    description = data.get('description')
    date = data.get('date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    capacity = data.get('capacity')
    external = data.get('external')
    external_id = data.get('external_id')
    external_url = data.get('external_url')
    password = data.get('password')

    if external:
        external_event = Event.query.filter_by(external_id=external_id).first()
        if external_event:
            abort(400, description='You cannot import an event that has already been imported')

    if not name or not description or not date or not start_time or not end_time or not capacity or not password :
        abort(400, description="No 'name' or'description' or 'date' or 'start_time' or 'end_time' or 'capacity' or 'password' provided")

    new_event = Event(name=name, description=description, date=date, start_time=start_time, end_time=end_time, capacity=capacity, password=password, external=external, external_id=external_id, external_url=external_url)
    db.session.add(new_event)
    db.session.commit()

    return jsonify({
        'message': 'New event has been successfully added',
        'role': new_event.to_dict()
    })


@bp.route('/events/<int:event_id>', methods=['PATCH'])
@role_based_access_control_be
def edit_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(event.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            if field == 'external_id':
                external_event = Event.query.filter_by(external_id=value).first()
                if external_event:
                    abort(400, description='You cannot import an event that has already been imported')
            
            if field == 'external':
                if not bool(value):
                    event.external_id = None
                    event.external_url = None
            setattr(event, field, value)
    
    db.session.commit()

    return jsonify({
        'message': 'Event has be updated successfully',
        'user': event.to_dict()
    })


@bp.route('/events/<int:event_id>/archive', methods=['POST'])
@role_based_access_control_be
def archive_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    event.archive()
    db.session.commit()

    return jsonify({'message': 'The event has been successfully archived'})


@bp.route('/events/<int:event_id>/activate', methods=['POST'])
@role_based_access_control_be
def activate_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    event.activate()
    db.session.commit()

    return jsonify({'message': 'The event has been successfully activated'})

#------------------------------------------ EVENT LOCATION / TIMESLOT ------------------------------------------#

@bp.route('/events/<int:event_id>/locations', methods=['GET'])
@role_based_access_control_be
def get_event_locations(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    
    ordered_event_locations = helper.get_ordered_event_locations(event_id)
    data = helper.filter_model_by_query_and_properties(EventLocation, request.args, input_data=ordered_event_locations)

    return jsonify(data)


@bp.route('/events/<int:event_id>/locations/<int:event_location_id>', methods=['GET'])
@role_based_access_control_be
def get_event_location(event_id, event_location_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    
    event_location = EventLocation.query.filter_by(id=event_location_id).first_or_404()

    return jsonify(event_location.to_dict())


@bp.route('/events/<int:event_id>/timeslots', methods=['GET'])
@role_based_access_control_be
def get_event_timeslots(event_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    
    ordered_event_timeslots = helper.get_ordered_event_timeslots(event_id)
    data = helper.filter_model_by_query_and_properties(EventLocation, request.args, input_data=ordered_event_timeslots)

    return jsonify(data)

@bp.route('/events/<int:event_id>/timeslots/<int:event_timeslot_id>', methods=['GET'])
@role_based_access_control_be
def get_event_timeslot(event_id, event_timeslot_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    
    event_timeslot = EventTimeslot.query.filter_by(id=event_timeslot_id).first_or_404()

    return jsonify(event_timeslot.to_dict())


@bp.route('/events/<int:event_id>/locations', methods=['POST'])
@role_based_access_control_be
def add_event_location(event_id):
    Event.query.filter_by(id=event_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    location_id = data.get('location_id')
    order = data.get('order')

    if location_id == None or order == None:
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

    helper.update_event_location_visibility(event_location)

    return jsonify({
        'message': 'Location has been added to the event',
        'event_location': event_location.to_dict()
                    
    })


@bp.route('/events/<int:event_id>/timeslots', methods=['POST'])
@role_based_access_control_be
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

    helper.update_event_timeslot_visibility(event_timeslot)

    return jsonify({
        'message': 'Timeslot has been added to the event',
        'event_timeslot': event_timeslot.to_dict()
    })
    

@bp.route('/events/<int:event_id>/locations/<int:event_location_id>/update_order', methods=['POST'])
@role_based_access_control_be
def update_event_location_order(event_id, event_location_id):
    Event.query.filter_by(id=event_id).first_or_404()
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    order = data.get('order')

    if order is None:
        abort(400, description="No'order' provided")

    # Check to see if updating this order will require a cascade update (ie: updating order 4 to be order 2 meaning the current order 2 needs to become 3 and 3 becomes 4)
    current_event_location_ids = [location.id for location in helper.get_ordered_event_locations(event_id)]
    
    updated_event_location_ids = helper.reorder_ids(current_event_location_ids, event_location_id, order)

    if current_event_location_ids == updated_event_location_ids:
        return {'message': 'No update needed'}, 200
    
    for new_order, location_id in enumerate(updated_event_location_ids):
        location = EventLocation.query.filter_by(id=location_id).first()
        location.order = new_order
        db.session.commit()

    return jsonify({
        'event_locations': [location.id for location in helper.get_ordered_event_locations(event_id)]
    })


@bp.route('/events/<int:event_id>/locations/<int:event_location_id>', methods=['DELETE'])
@role_based_access_control_be
def delete_event_location(event_id, event_location_id):
    Event.query.filter_by(id=event_id).first_or_404()
    event_location = EventLocation.query.filter_by(id=event_location_id).first_or_404()
    
    if not helper.prep_delete_event_location(event_location_id):
        abort(500, description="An error occured when trying to remove event_location")

    current_event_location_ids = [location.id for location in helper.get_ordered_event_locations(event_id)]

    updated_event_location_ids = helper.remove_id_from_list(current_event_location_ids, event_location_id)

    for new_order, location_id in enumerate(updated_event_location_ids):
        location = EventLocation.query.filter_by(id=location_id).first()
        location.order = new_order
    
    db.session.delete(event_location)
    db.session.commit()
    

    return jsonify({'message': "Event location has been successfully deleted"})


@bp.route('/events/<int:event_id>/timeslots/<int:event_timeslot_id>', methods=['DELETE'])
@role_based_access_control_be
def delete_event_timeslot(event_id, event_timeslot_id):
    Event.query.filter_by(id=event_id).first_or_404()
    event_timeslot = EventTimeslot.query.filter_by(id=event_timeslot_id).first_or_404()


    if not helper.prep_delete_event_Timeslot(event_timeslot_id):
        abort(500, description="An error occured when trying to remove event_timeslot")
    
    db.session.delete(event_timeslot)
    db.session.commit()

    return jsonify({'message': "Event timeslot has been successfully deleted"})


@bp.route('/events/<int:event_id>/sessions', methods=['GET'])
@role_based_access_control_be
def get_event_sessions(event_id):
    # Check if the event exists
    event = Event.query.filter_by(id=event_id).first_or_404()
    sessions = event.sessions

    mutable_args = request.args.to_dict()
    show_private = mutable_args.pop('show_private', None).lower() == 'true'
    
    data = helper.filter_model_by_query_and_properties(Session, mutable_args, input_data=sessions, return_objects=True)
    
    for session in data.copy():
        if (not session.event_location.publicly_visible and not show_private) or (not session.event_timeslot.publicly_visible and not show_private) and not session.event_timeslot.timeslot.is_break:
            data.remove(session)

    return_obj = [session.to_dict() for session in data]

    return jsonify({'data': return_obj})

#------------------------------------------ SESSION ------------------------------------------#


@bp.route('/sessions/<int:session_id>', methods=['GET'])
@role_based_access_control_be
def get_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()
    return jsonify({
        'sessions': session.to_dict()
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['GET'])
@role_based_access_control_be
def get_workshop_for_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()
    
    if not session.has_workshop:
        abort(400, description="Session has no workshop")

    workshop = session.workshop
    
    return jsonify({
        'workshop': workshop.to_dict()
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['POST'])
@role_based_access_control_be
def add_workshop_to_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    workshop_id = data.get('workshop_id')
    force = data.get('force')

    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()

    if not workshop_id:
        abort(400, description="No 'workshop_id' provided")
    
    if session.has_workshop and not force:
        abort(400, description="Session already has a workshop")
    
    
    session.workshop_id = workshop_id
    session.publicly_visible = workshop.publicly_visible
    db.session.commit()

    helper.update_session_event_location_visibility(session)

    return jsonify({
        'message': 'Workshop successfully added to session'
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['DELETE'])
@role_based_access_control_be
def remove_workshop_from_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()

    if not session.has_workshop:
        abort(400, description="Session has no workshop")
    
    session.workshop_id = None
    session.publicly_visible = True
    db.session.commit()
    
    helper.update_session_event_location_visibility(session)

    return jsonify({'message': 'Workshop successfully removed from session'})


#------------------------------------------ PAGE ------------------------------------------#

@bp.route('/pages', methods=['GET'])
@role_based_access_control_be
def get_pages():
    pages = helper.filter_model_by_query_and_properties(Page, request.args)
    return jsonify(pages)


@bp.route('/pages/<field>', methods=['GET'])
@role_based_access_control_be
def get_pages_field(field):
    pages = helper.filter_model_by_query_and_properties(Page, request.args, field)
    return jsonify(pages)


#------------------------------------------ CONFIG ------------------------------------------#

@bp.route('/config/<string:key>', methods=['GET'])
@role_based_access_control_be
def get_config_value(key):
    if not helper.user_has_access_to_page('settings'):
        abort(403, description='You do not have access to the requested resource with your current role')
    config = Config.query.filter_by(key=key).first_or_404()
    return jsonify(config.to_dict())