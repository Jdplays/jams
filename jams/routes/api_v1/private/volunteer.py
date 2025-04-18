# API is for serving data to Typscript/Javascript
from flask import Blueprint, request, jsonify, abort
from datetime import datetime, UTC
from jams.decorators import api_route, protect_user_updates
from jams.models import db, VolunteerAttendance, VolunteerSignup, Event, User
from jams.models.event import FireList
from jams.util import helper
from jams.util.sse import sse_stream

# Use gevent.sleep if available to avoid blocking the event loop.
# Falls back to time.sleep in development or if gevent is not installed.
try:
    from gevent import sleep as smart_sleep
except ImportError:
    from time import sleep as smart_sleep 

bp = Blueprint('volunteer', __name__)

# URL PREFIX = /api/v1

#------------------------------------------ Volunteer Attendance ------------------------------------------#

@bp.route('/events/<int:event_id>/volunteer_attendences', methods=['GET'])
@api_route
def get_event_attendance(event_id):
    Event.query.filter_by(id=event_id).first_or_404()

    args = request.args.to_dict()
    args['event_id'] = str(event_id)

    data = helper.filter_model_by_query_and_properties(VolunteerAttendance, args)
    
    setup_count = VolunteerAttendance.query.filter_by(event_id=event_id, setup=True).count()
    main_count = VolunteerAttendance.query.filter_by(event_id=event_id, main=True).count()
    packdown_count = VolunteerAttendance.query.filter_by(event_id=event_id, packdown=True).count()

    data['metadata'] = {
        'setup_count': setup_count,
        'main_count': main_count,
        'packdown_count': packdown_count
    }

    return jsonify(data)

@bp.route('/users/<int:user_id>/volunteer_attendences/<int:event_id>', methods=['GET'])
@api_route
def get_user_attendance(user_id, event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    attendance = VolunteerAttendance.query.filter_by(user_id=user_id, event_id=event_id).first_or_404()
    return jsonify({'volunteer_attendence': attendance.to_dict()})


@bp.route('/users/<int:user_id>/volunteer_attendences/<int:event_id>', methods=['POST'])
@protect_user_updates
@api_route
def add_user_attendance(user_id, event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    if event.date.date() < datetime.now(UTC).date():
        return jsonify({'message': 'Cannot update attendance for a past event'}), 400

    User.query.filter_by(id=user_id).first_or_404()
    att = VolunteerAttendance.query.filter_by(user_id=user_id, event_id=event_id).first()

    if att is not None:
        return edit_user_attendance(user_id=user_id, event_id=event_id)

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    setup = bool(data.get('setup'))
    main = bool(data.get('main'))
    packdown = bool(data.get('packdown'))
    note = data.get('note')

    attendance = VolunteerAttendance(event_id=event_id, user_id=user_id, setup=setup, main=main, packdown=packdown, note=note)
    db.session.add(attendance)
    db.session.commit()

    # Create fire list entry
    fire_list_entry = FireList.query.filter_by(event_id=event_id, user_id=user_id).first()
    if attendance.main:
        if not fire_list_entry:
            fire_list_entry = FireList(event_id=event_id, user_id=user_id)
            db.session.add(fire_list_entry)
            db.session.commit()
    else:
        if fire_list_entry:
            db.session.delete(fire_list_entry)
            db.session.commit()

    return jsonify({
        'message': 'Volunteer Attendance has been successfully added',
        'data': attendance.to_dict()
    })


@bp.route('/users/<int:user_id>/volunteer_attendences/<int:event_id>', methods=['PATCH'])
@protect_user_updates
@api_route
def edit_user_attendance(user_id, event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    if event.date.date() < datetime.now(UTC).date():
        return jsonify({'message': 'Cannot update attendance for a past event'}), 400
    User.query.filter_by(id=user_id).first_or_404()
    attendance = VolunteerAttendance.query.filter_by(user_id=user_id, event_id=event_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    # Update each allowed field
    allowed_fields = list(attendance.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            setattr(attendance, field, value)

    db.session.commit()

    # Create fire list entry
    fire_list_entry = FireList.query.filter_by(event_id=event_id, user_id=user_id).first()
    if attendance.main:
        if not fire_list_entry:
            fire_list_entry = FireList(event_id=event_id, user_id=user_id)
            db.session.add(fire_list_entry)
            db.session.commit()
    else:
        if fire_list_entry:
            db.session.delete(fire_list_entry)
            db.session.commit()

    return jsonify({
        'message': 'Volunteer Attendance has been successfully edited',
        'data': attendance.to_dict()
    })

#------------------------------------------ Volunteer Signup ------------------------------------------#

@bp.route('/events/<int:event_id>/volunteer_signups', methods=['GET'])
@api_route
def get_event_volunteer_signups(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    signups = VolunteerSignup.query.filter_by(event_id=event_id).all()
    data = helper.filter_model_by_query_and_properties(VolunteerSignup, request.args, input_data=signups)
    return jsonify(data)

@bp.route('/events/<int:event_id>/volunteer_signups/stream')
@api_route
def get_event_volunteer_signups_sse(event_id):
    Event.query.filter_by(id=event_id).first_or_404()

    def fetch_data():
        args = request.args.to_dict()
        args['$all_rows'] = 'True'
        signups = VolunteerSignup.query.filter_by(event_id=event_id).all()
        signups, _ = helper.filter_model_by_query_and_properties(VolunteerSignup, args, input_data=signups, return_objects=True)
        return [signup.to_dict() for signup in signups]
    
    return sse_stream(fetch_data)

@bp.route('/events/<int:event_id>/volunteer_signups/<int:user_id>', methods=['GET'])
@api_route
def get_user_signups(event_id, user_id):
    Event.query.filter_by(id=event_id).first_or_404()
    User.query.filter_by(id=user_id).first_or_404()
    signups = VolunteerSignup.query.filter_by(user_id=user_id, event_id=event_id).all()
    data = helper.filter_model_by_query_and_properties(VolunteerSignup, request.args, input_data=signups)
    
    return jsonify(data)

@bp.route('/events/<int:event_id>/volunteer_signups/<int:user_id>', methods=['POST'])
@protect_user_updates
@api_route
def add_volunteer_signup(event_id, user_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    if event.date.date() < datetime.now(UTC).date():
        return jsonify({'message': 'Cannot update signups for a past event'}), 400
    User.query.filter_by(id=user_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    session_id = data.get('session_id')

    signup = VolunteerSignup.query.filter_by(event_id=event_id, user_id=user_id, session_id=session_id).first()
    if signup:
        abort(400, description="Signup Entry already exists")
    
    signup = VolunteerSignup(event_id=event_id, user_id=user_id, session_id=session_id)

    db.session.add(signup)
    db.session.commit()

    return jsonify({
        'message': 'Volunteer Signup Entry has been successfully added',
        'data': signup.to_dict()
    })

@bp.route('/events/<int:event_id>/volunteer_signups/<int:user_id>/sessions/<int:session_id>', methods=['DELETE'])
@protect_user_updates
@api_route
def remove_volunteer_signup(event_id, user_id, session_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    if event.date.date() < datetime.now(UTC).date():
        return jsonify({'message': 'Cannot update signups for a past event'}), 400
    User.query.filter_by(id=user_id).first_or_404()

    signup = VolunteerSignup.query.filter_by(event_id=event_id, user_id=user_id, session_id=session_id).first_or_404()

    db.session.delete(signup)
    db.session.commit()

    return jsonify({
        'message': 'Volunteer Signup Entry has been successfully removed'
    })