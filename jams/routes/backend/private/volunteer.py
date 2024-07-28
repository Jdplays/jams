# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify, abort
from flask_security import login_required
from jams.decorators import role_based_access_control_be, protect_user_updates
from jams.models import db, VolunteerAttendance

bp = Blueprint('volunteer', __name__)

# URL PREFIX = /backend

#------------------------------------------ Volunteer Attendance ------------------------------------------#

@bp.route('/users/<int:user_id>/voluteer_attendences/<int:event_id>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_user_attendance(user_id, event_id):
    attendance = VolunteerAttendance.query.filter_by(user_id=user_id, event_id=event_id).first_or_404()
    return jsonify({'voluteer_attendence': attendance.to_dict()})


@bp.route('/users/<int:user_id>/voluteer_attendences/<int:event_id>', methods=['POST'])
@login_required
@protect_user_updates
@role_based_access_control_be
def add_user_attendance(user_id, event_id):
    att = VolunteerAttendance.query.filter_by(user_id=user_id, event_id=event_id).first()

    if att is not None:
        abort(400, description="User already has attendance for this event")

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

    return jsonify({
        'message': 'Volunteer Attendance has been successfully added',
        'voluteer_attendence': attendance.to_dict()
    })


@bp.route('/users/<int:user_id>/voluteer_attendences/<int:event_id>', methods=['PATCH'])
@login_required
@protect_user_updates
@role_based_access_control_be
def edit_user_attendance(user_id, event_id):
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

    return jsonify({
        'message': 'Volunteer Attendance has been successfully edited',
        'voluteer_attendence': attendance.to_dict()
    })