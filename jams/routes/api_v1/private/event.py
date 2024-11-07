# API is for serving data to Typscript/Javascript
import json
from flask import Blueprint, request, jsonify, abort
from jams.decorators import api_route
from flask_security import login_required
from jams.integrations import jolt
from jams.models import db, Attendee, Event
from jams.models.event import FireList
from jams.util import helper
from jams.configuration import ConfigType, get_config_value
from jams.util.enums import AttendeeSource

bp = Blueprint('event', __name__)

# URL PREFIX = /api/v1

#------------------------------------------ ATTENDEES ------------------------------------------#

@bp.route('/events/<int:event_id>/attendees', methods=['GET'])
@api_route
def get_attendees(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    args = request.args.to_dict()
    args['event_id'] = str(event_id)
    data = helper.filter_model_by_query_and_properties(Attendee, args)

    return jsonify(data)

@bp.route('/events/<int:event_id>/attendees', methods=['POST'])
@api_route
def add_attendee(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    email = data.get('email')
    age = data.get('age')
    gender = data.get('gender')
    registerable = data.get('registerable')
    event_id = data.get('event_id')
    

    if not name or not email or not age or gender == '-1' or registerable == None or event_id == '-1':
        abort(400, description="Not enough data provided")

    new_attendee = Attendee(name=name, email=email, age=age, gender=gender, registerable=registerable, event_id=event_id)
    db.session.add(new_attendee)
    db.session.commit()

    new_attendee.link_to_account()

    new_attendee.create_fire_list_entry()

    return jsonify({
        'message': 'Attendee successfully added',
        'data': new_attendee.to_dict()
    })


@bp.route('/events/<int:event_id>/attendees/<int:attendee_id>', methods=['PATCH'])
@api_route
def edit_attendee(event_id, attendee_id):
    Event.query.filter_by(id=event_id).first_or_404()
    attendee = Attendee.query.filter_by(id=attendee_id).first_or_404()

    if attendee.source == AttendeeSource.EVENTBRITE.name:
        abort(400, description='Unable to edit attendee imported via eventbrite')

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(attendee.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            if field == 'checked_in':
                continue
            setattr(attendee, field, value)
    attendee.last_update_source = AttendeeSource.LOCAL.name

    db.session.commit()

    return jsonify({
        'message': 'Attendee has be updated successfully',
        'data': attendee.to_dict()
    })

@bp.route('/events/<int:event_id>/attendees/<int:attendee_id>/check_in', methods=['POST'])
@api_route
def check_in_attendee(event_id, attendee_id):
    Event.query.filter_by(id=event_id).first_or_404()
    attendee = Attendee.query.filter_by(id=attendee_id).first_or_404()

    attendee.check_in()

    db.session.commit()

    return jsonify({
        'message': 'Attendee has be checked in successfully',
        'data': attendee.to_dict()
    })

@bp.route('/events/<int:event_id>/attendees/<int:attendee_id>/check_out', methods=['POST'])
@api_route
def check_out_attendee(event_id, attendee_id):
    Event.query.filter_by(id=event_id).first_or_404()
    attendee = Attendee.query.filter_by(id=attendee_id).first_or_404()

    attendee.check_out()

    db.session.commit()

    return jsonify({
        'message': 'Attendee has be checked out successfully',
        'data': attendee.to_dict()
    })


#------------------------------------------ FIRELIST ------------------------------------------#

@bp.route('/events/<int:event_id>/fire_list', methods=['GET'])
@api_route
def get_fire_list(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    args = request.args.to_dict()
    args['event_id'] = str(event_id)
    data = helper.filter_model_by_query_and_properties(FireList, args)

    return jsonify(data)

@bp.route('/events/<int:event_id>/fire_list/<int:fire_list_entry_id>/check_in', methods=['POST'])
@api_route
def check_in_fire_list_item(event_id, fire_list_entry_id):
    Event.query.filter_by(id=event_id).first_or_404()
    fire_list_entry = FireList.query.filter_by(id=fire_list_entry_id).first_or_404()

    if fire_list_entry.attendee:
        attendee = Attendee.query.filter_by(id=fire_list_entry.attendee_id).first_or_404()
        attendee.check_in()
    else:
        fire_list_entry.check_in()

    db.session.commit()

    return jsonify({
        'message': 'Fire List item has been checked in successfully',
        'data': fire_list_entry.to_dict()
    })

@bp.route('/events/<int:event_id>/fire_list/<int:fire_list_entry_id>/check_out', methods=['POST'])
@api_route
def check_out_fire_list_item(event_id, fire_list_entry_id):
    Event.query.filter_by(id=event_id).first_or_404()
    fire_list_entry = FireList.query.filter_by(id=fire_list_entry_id).first_or_404()

    if fire_list_entry.attendee:
        attendee = Attendee.query.filter_by(id=fire_list_entry.attendee_id).first_or_404()
        attendee.check_out()
    else:
        fire_list_entry.check_out()

    db.session.commit()

    return jsonify({
        'message': 'Fire List item has been checked out successfully',
        'data': fire_list_entry.to_dict()
    })