# API is for serving data to Typscript/Javascript
from flask import Blueprint, request, jsonify, abort
from jams.decorators import role_based_access_control_be
from flask_security import login_required
from jams.models import db, Attendee, Event
from jams.util import helper

bp = Blueprint('event', __name__)

# URL PREFIX = /api/v1

#------------------------------------------ ATTENDEES ------------------------------------------#
@bp.route('/events/<int:event_id>/attendees', methods=['GET'])
@role_based_access_control_be
def get_attendees(event_id):
    event = Event.query.filter_by(id=event_id).first()
    data = helper.filter_model_by_query_and_properties(Attendee, request.args, input_data=event.attendees)

    return jsonify(data)

@bp.route('/events/<int:event_id>/attendees', methods=['POST'])
@role_based_access_control_be
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

    return jsonify({
        'message': 'Attendee successfully added',
        'data': new_attendee.to_dict()
    })


@bp.route('/events/<int:event_id>/attendees/<int:attendee_id>', methods=['PATCH'])
@role_based_access_control_be
def edit_attendee(event_id, attendee_id):
    Event.query.filter_by(id=event_id).first_or_404()
    attendee = Attendee.query.filter_by(id=attendee_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(attendee.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            setattr(attendee, field, value)

    db.session.commit()

    return jsonify({
        'message': 'Attendee has be updated successfully',
        'data': attendee.to_dict()
    })