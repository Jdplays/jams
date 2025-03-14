# API is for serving data to Typscript/Javascript
import io
from datetime import timedelta
from PIL import Image
from flask import Blueprint, request, jsonify, abort, current_app
from flask_security import login_required, current_user
from jams.decorators import api_route, protect_user_updates
from jams.models import db, User, Role, Event, EventLocation, EventTimeslot, Session, Page, Config, Workshop, AttendanceStreak
from jams.util import helper
from jams.util import files
from jams.endpoint_loader import generate_roles_file_from_db, update_pages_assigned_to_role
from jams.integrations.eventbrite import deactivate_event_update_tasks
from jams.util.database import create_event
from jams.util.task_scheduler import create_event_tasks, update_scheduled_post_event_task_date

bp = Blueprint('admin', __name__)

# URL PREFIX = /api/v1

#------------------------------------------ USER ------------------------------------------#

@bp.route('/users', methods=['GET'])
@api_route
def get_users():
    users = helper.filter_model_by_query_and_properties(User, request.args)
    return jsonify(users)


@bp.route('/users/<field>', methods=['GET'])
@api_route
def get_users_field(field):
    users = helper.filter_model_by_query_and_properties(User, request.args, field)
    return jsonify(users)


@bp.route('/users/<int:user_id>', methods=['GET'])
@api_route
def get_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()

    if current_user.id == user_id or helper.user_has_access_to_page('user_management'):
        return jsonify(user.to_dict())
    else:
        return jsonify(user.public_info_dict())

@bp.route('/users/<int:user_id>/public_info', methods=['GET'])
@api_route
def get_user_public_info(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    return jsonify(user.public_info_dict())

@bp.route('/users/public_info', methods=['GET'])
@api_route
def get_users_public_info():
    users, row_count = helper.filter_model_by_query_and_properties(User, request.args, return_objects=True)
    data_list = [user.public_info_dict() for user in users]

    default_args = helper.extract_default_args_from_request(request.args)

    return_obj = helper.build_multi_object_paginated_return_obj(data_list, default_args.pagination_block_size, default_args.pagination_start_index, default_args.order_by, default_args.order_direction, row_count)
    return jsonify(return_obj)

@bp.route('/users/<int:user_id>/<field>', methods=['GET'])
@api_route
def get_user_field(user_id, field):
    user = User.query.filter_by(id=user_id).first_or_404()
    allowed_fields = list(user.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    return jsonify({field: getattr(user, field)})


@bp.route('/users/<int:user_id>', methods=['PATCH'])
@login_required
@protect_user_updates
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
            if field == 'badge_text' or field == 'badge_icon':
                if current_user.id == user_id:
                    abort(400, description='User cannot update their own badge')
                    continue
            setattr(user, field, value)
    
    db.session.commit()

    return jsonify({
        'message': 'User has be updated successfully',
        'data': user.to_dict()
    })

@bp.route('/users/me/avatar', methods=['POST'])
@api_route
def upload_user_avatar():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file.mimetype.startswith('image/'):
        return jsonify({'error': 'The uploaded file is not an image'}), 400

    # Verify that the file is a valid image
    try:
        img = Image.open(file)
        img.verify()
        img = Image.open(file)
    except (IOError, SyntaxError) as e:
        print(f'Invalidimage file: {e}')
        return jsonify({'error': 'Invalid Image file'}), 400
    
    # Convert image to png
    jpeg_image = img.convert('RGB')

    # Resize image to a smaller size for profile pictures
    MAX_SIZE = (256, 256)
    jpeg_image.thumbnail(MAX_SIZE, Image.LANCZOS)

    # Save the compressed image
    image_stream = io.BytesIO()
    jpeg_image.save(image_stream, format='JPEG', optimize=True, compress_level=85)
    image_stream.seek(0)

    # Upload to storage
    file_path = f'users/{current_user.id}/profile.jpg'
    file_db_obj = files.upload_file(bucket_name=files.user_data_bucket, file_name=file_path, file_data=image_stream)

    if not file_db_obj:
        return jsonify({'error': 'An error occured while uploading the file'}), 500
    
    current_user.avatar_file_id = file_db_obj.id # Set the users profile file ID
    db.session.commit()

    return jsonify({
        'message': 'Avatar successfully uploaded',
        'file_data': file_db_obj.to_dict()
    })


@bp.route('/users/<int:user_id>/archive', methods=['POST'])
@api_route
def archive_user(user_id):
    if current_user.id == user_id:
        abort(400, description='User cannot archive themself')
    user = User.query.filter_by(id=user_id).first_or_404()
    user.archive()
    db.session.commit()

    return jsonify({'message': 'The user has been successfully archived'})


@bp.route('/users/<int:user_id>/activate', methods=['POST'])
@api_route
def activate_user(user_id):
    user = User.query.filter_by(id=user_id).first_or_404()
    user.activate()
    db.session.commit()

    return jsonify({'message': 'The user has been successfully activated'})

#------------------------------------------ ROLE ------------------------------------------#

@bp.route('/roles', methods=['GET'])
@api_route
def get_roles():
    roles = helper.filter_model_by_query_and_properties(Role, request.args)
    return jsonify(roles)


@bp.route('/roles/<field>', methods=['GET'])
@api_route
def get_roles_field(field):
    roles = helper.filter_model_by_query_and_properties(Role, request.args, field)
    return jsonify(roles)

@bp.route('/roles/public', methods=['GET'])
@api_route
def get_roles_public_info():
    role_objs, count = helper.filter_model_by_query_and_properties(Role, request.args, return_objects=True)
    return jsonify({'data': [role.public_info_dict() for role in role_objs]})


@bp.route('/roles/<int:role_id>', methods=['GET'])
@api_route
def get_role(role_id):
    role = Role.query.filter_by(id=role_id).first_or_404()
    return jsonify(role.to_dict())


@bp.route('/roles/<int:role_id>/<field>', methods=['GET'])
@api_route
def get_role_field(role_id, field):
    role = Role.query.filter_by(id=role_id).first_or_404()
    allowed_fields = list(role.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    return jsonify({field: getattr(role, field)})


@bp.route('/roles', methods=['POST'])
@api_route
def add_role():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    name = data.get('name')
    description = data.get('description')
    page_ids = data.get('page_ids')
    display_colour = data.get('display_colour')
    priority = data.get('priority')
    hidden = data.get('hidden')

    if not name:
        abort(400, description="No 'name' provided")

    new_role = Role(name=name, description=description, display_colour=display_colour, priority=priority, hidden=hidden)
    db.session.add(new_role)
    db.session.commit()

    update_pages_assigned_to_role(new_role.id, page_ids)
    generate_roles_file_from_db()

    return jsonify({
        'message': 'New role has been successfully added',
        'role': new_role.to_dict()
    })


@bp.route('/roles/<int:role_id>', methods=['PATCH'])
@api_route
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
@api_route
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
@api_route
def get_events():
    data = helper.filter_model_by_query_and_properties(Event, request.args)
    return jsonify(data)


@bp.route('/events/<field>', methods=['GET'])
@api_route
def get_events_field(field):
    data = helper.filter_model_by_query_and_properties(Event, request.args, field)
    return jsonify(data)

@bp.route('/events/<int:event_id>/metadata', methods=['GET'])
@api_route
def get_event_metadata(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    return jsonify({'data': event.get_metadata()})


@bp.route('/events/<int:event_id>', methods=['GET'])
@api_route
def get_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    return jsonify(event.to_dict())


@bp.route('/events/<int:event_id>/<field>', methods=['GET'])
@api_route
def get_event_field(event_id, field):
    event = Event.query.filter_by(id=event_id).first_or_404()
    allowed_fields = list(event.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    value = getattr(event, field)
    if field == 'date':
        value = helper.convert_datetime_to_local_timezone(value)
    
    return jsonify({field: str(value)})


@bp.route('/events', methods=['POST'])
@api_route
def add_event():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    description = data.get('description')
    date = data.get('date')
    start_date_time = data.get('start_date_time')
    end_date_time = data.get('end_date_time')
    capacity = data.get('capacity')
    external = data.get('external')
    external_id = data.get('external_id')
    external_url = data.get('external_url')
    password = data.get('password')

    if external:
        external_event = Event.query.filter_by(external_id=external_id).first()
        if external_event:
            abort(400, description='You cannot import an event that has already been imported')

    if not name or not description or not date or not start_date_time or not end_date_time or not capacity or not password :
        abort(400, description="No 'name' or'description' or 'date' or 'start_time' or 'end_time' or 'capacity' or 'password' provided")
    
    start_date_time = helper.convert_local_datetime_to_utc(start_date_time)
    end_date_time = helper.convert_local_datetime_to_utc(end_date_time)

    new_event = create_event(name=name, description=description, date=date, start_date_time=start_date_time, end_date_time=end_date_time, capacity=capacity, password=password, external=external, external_id=external_id, external_url=external_url)
    db.session.add(new_event)
    db.session.commit()

    create_event_tasks(new_event)

    return jsonify({
        'message': 'New event has been successfully added',
        'role': new_event.to_dict()
    })


@bp.route('/events/<int:event_id>', methods=['PATCH'])
@api_route
def edit_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(event.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            if field == 'start_date_time' or field == 'end_date_time':
                value = helper.convert_local_datetime_to_utc(value)

                # If the end datetime has changed, update the post event task run datetime
                if field == 'end_date_time':
                    new_task_datetime = value + timedelta(hours=1)
                    update_scheduled_post_event_task_date(event, new_task_datetime)
            if field == 'external_id':
                external_event = Event.query.filter_by(external_id=value).first()
                if external_event:
                    abort(400, description='You cannot import an event that has already been imported')
            
            if field == 'external':
                if not bool(value):
                    event.external_id = None
                    event.external_url = None
                    deactivate_event_update_tasks(event)
                
            setattr(event, field, value)
    
    db.session.commit()

    create_event_tasks(event)

    return jsonify({
        'message': 'Event has be updated successfully',
        'user': event.to_dict()
    })

@bp.route('/events/<int:event_id>/tasks/regenerate', methods=['POST'])
@api_route
def regenerate_event_tasks(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    try:
        create_event_tasks(event)
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to regenerate event tasks for unknown reason'}), 400
    
    return jsonify({'message': 'Successfully regenerated event tasks'}), 200

@bp.route('/events/<int:event_id>/archive', methods=['POST'])
@api_route
def archive_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    event.archive()
    db.session.commit()

    return jsonify({'message': 'The event has been successfully archived'})


@bp.route('/events/<int:event_id>/activate', methods=['POST'])
@api_route
def activate_event(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    event.activate()
    db.session.commit()

    return jsonify({'message': 'The event has been successfully activated'})

#------------------------------------------ EVENT LOCATION / TIMESLOT ------------------------------------------#

@bp.route('/events/<int:event_id>/locations', methods=['GET'])
@api_route
def get_event_locations(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    
    ordered_event_locations = helper.get_ordered_event_locations(event_id)

    return jsonify([els.to_dict() for els in ordered_event_locations])


@bp.route('/events/<int:event_id>/locations/<int:event_location_id>', methods=['GET'])
@api_route
def get_event_location(event_id, event_location_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    
    event_location = EventLocation.query.filter_by(id=event_location_id).first_or_404()

    return jsonify(event_location.to_dict())


@bp.route('/events/<int:event_id>/timeslots', methods=['GET'])
@api_route
def get_event_timeslots(event_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()

    public = request.args.get('publicly_visible')
    
    ordered_event_timeslots = helper.get_ordered_event_timeslots(event_id, public)

    return jsonify([ets.to_dict() for ets in ordered_event_timeslots])

@bp.route('/events/<int:event_id>/timeslots/<int:event_timeslot_id>', methods=['GET'])
@api_route
def get_event_timeslot(event_id, event_timeslot_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    
    event_timeslot = EventTimeslot.query.filter_by(id=event_timeslot_id).first_or_404()

    return jsonify(event_timeslot.to_dict())


@bp.route('/events/<int:event_id>/locations', methods=['POST'])
@api_route
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
@api_route
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
@api_route
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
@api_route
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
@api_route
def delete_event_timeslot(event_id, event_timeslot_id):
    Event.query.filter_by(id=event_id).first_or_404()
    event_timeslot = EventTimeslot.query.filter_by(id=event_timeslot_id).first_or_404()


    if not helper.prep_delete_event_Timeslot(event_timeslot_id):
        abort(500, description="An error occured when trying to remove event_timeslot")
    
    db.session.delete(event_timeslot)
    db.session.commit()

    return jsonify({'message': "Event timeslot has been successfully deleted"})


@bp.route('/events/<int:event_id>/sessions', methods=['GET'])
@api_route
def get_event_sessions(event_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    sessions = Session.query.filter_by(event_id=event_id).all()

    mutable_args = request.args.to_dict()
    mutable_args['event_id'] = str(event_id)
    show_private_text = mutable_args.pop('show_private', None)
    show_private = False
    if show_private_text:
        show_private = show_private_text.lower() == 'true'
    
    data, row_count = helper.filter_model_by_query_and_properties(Session, mutable_args, input_data=sessions, return_objects=True)
    
    tmp_data = data.copy()
    for session in tmp_data:
        if (not session.event_location.publicly_visible and not show_private) or (not session.event_timeslot.publicly_visible and not show_private) and not session.event_timeslot.timeslot.is_break:

            data.remove(session)

    return_obj = [session.to_dict() for session in data]

    return jsonify({'data': return_obj})

#------------------------------------------ SESSION ------------------------------------------#


@bp.route('/sessions/<int:session_id>', methods=['GET'])
@api_route
def get_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()
    return jsonify({
        'sessions': session.to_dict()
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['GET'])
@api_route
def get_workshop_for_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()
    
    if not session.has_workshop:
        abort(400, description="Session has no workshop")

    workshop = session.workshop
    
    return jsonify({
        'workshop': workshop.to_dict()
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['POST'])
@api_route
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

    session.capacity = helper.calculate_session_capacity(session)
    db.session.commit()

    helper.update_session_event_location_visibility(session)

    return jsonify({
        'message': 'Workshop successfully added to session'
    })


@bp.route('/sessions/<int:session_id>/workshop', methods=['DELETE'])
@api_route
def remove_workshop_from_session(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()

    if not session.has_workshop:
        abort(400, description="Session has no workshop")
    
    session.workshop_id = None
    session.publicly_visible = True
    session_volunteer_signups = session.volunteer_signups

    for volunteer_signup in session_volunteer_signups:
        db.session.delete(volunteer_signup)
    db.session.commit()
    
    helper.update_session_event_location_visibility(session)

    return jsonify({'message': 'Workshop successfully removed from session'})

@bp.route('/sessions/<int:session_id>/recalculate_capacity', methods=['POST'])
@api_route
def recalculate_session_capacity(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()
    session.capacity = helper.calculate_session_capacity(session)
    
    db.session.commit()

    return jsonify({
        'message': 'Session capacity updated',
        'data': session.capacity
        })

@bp.route('/sessions/<int:session_id>/settings', methods=['POST'])
@api_route
def update_session_settings(session_id):
    session = Session.query.filter_by(id=session_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    capacity = data.get('capacity')

    if not int(capacity):
        abort(400, description='Invalid capacity')
    
    session.capacity = capacity
    
    db.session.commit()

    return jsonify({'message': 'Session settings updated'})


#------------------------------------------ PAGE ------------------------------------------#

@bp.route('/pages', methods=['GET'])
@api_route
def get_pages():
    pages = helper.filter_model_by_query_and_properties(Page, request.args)
    return jsonify(pages)


@bp.route('/pages/<field>', methods=['GET'])
@api_route
def get_pages_field(field):
    pages = helper.filter_model_by_query_and_properties(Page, request.args, field)
    return jsonify(pages)


@bp.route('/config/<string:key>', methods=['GET'])
@api_route
def get_config_value(key):
    if not helper.user_has_access_to_page('settings'):
        abort(403, description='You do not have access to the requested resource with your current role')
    config = Config.query.filter_by(key=key).first_or_404()
    return jsonify(config.to_dict())

#------------------------------------------ USER STREAKS ------------------------------------------#

@bp.route('/users/me/streak', methods=['GET'])
@bp.route('/users/<int:user_id>/streak', methods=['GET'])
@api_route
def get_user_streak(user_id=None):
    if user_id is None:
        user_id = current_user.id
    streak = AttendanceStreak.query.filter_by(user_id=user_id).first_or_404()
    return jsonify({'data': streak.to_dict()})
