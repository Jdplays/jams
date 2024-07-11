# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify, abort
from flask_security import roles_required, login_required, current_user
from jams.models import db, User, Role, Event, VolunteerAttendance

bp = Blueprint('backend', __name__, url_prefix='/backend')

# URL PREFIX = /backend

#------------------------------------------ Volunteer Attendance ------------------------------------------#

@bp.route('/users/<int:user_id>/voluteer_attendences/<int:event_id>', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_user_attendance(user_id, event_id):
    attendance = VolunteerAttendance.query.filter_by(user_id=user_id, event_id=event_id).first_or_404()
    return jsonify({'voluteer_attendence': attendance.to_dict()})


@bp.route('/users/<int:user_id>/voluteer_attendences/<int:event_id>', methods=['POST'])
@login_required
@roles_required('Volunteer')
def add_user_attendance(user_id, event_id):
    if current_user.id is not user_id:
        abort(400, description="Unable to update another users attendence")


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
@roles_required('Volunteer')
def edit_user_attendance(user_id, event_id):
    if current_user.id is not user_id:
        abort(400, description="Unable to update another users attendence")

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
