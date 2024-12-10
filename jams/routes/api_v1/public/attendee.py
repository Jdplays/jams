# API is for serving data to Typscript/Javascript
from flask import Blueprint, redirect, request, jsonify, abort, session, url_for
from jams.models import db, AttendeeAccount, AttendeeAccountEvent, Attendee, AttendeeSignup, Event, Session
from jams.util import helper, attendee_auth
from jams.decorators import attendee_login_required, protect_attendee_updates

bp = Blueprint('attendee', __name__, url_prefix='/attendee')

# URL PREFIX = /api/v1/attendee

#------------------------------------------ AUTH ------------------------------------------#
@bp.route('/login', methods=['POST'])
def login():
    if 'attendee_id' in session:
        return redirect(url_for('routes.frontend.public.attendee.signup'))
    
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    email = data.get('email')
    order_id = data.get('order_id')
    password = data.get('password')

    next_event = helper.get_next_event()

    account = None

    if email:
        # Make sure that the account attached to that email has tickets to the event
        account = AttendeeAccount.query.filter_by(email=email).first()
        if not account:
            return jsonify({'message': 'Account does not exist'}), 404
        
        at_event = AttendeeAccountEvent.query.filter_by(attendee_account_id=account.id, event_id=next_event.id).first() is not None
        if not at_event:
            return jsonify({'message': 'Account does not have access to the current event'}), 403
    else:
        # Order ID is a bit more difficult as it doesnt directly attach to an account
        attendee = Attendee.query.filter_by(event_id=next_event.id, external_order_id=order_id).first()
        if not attendee:
            return jsonify({'message': 'Invalid Order ID for Event'}), 404

        account = AttendeeAccount.query.filter_by(id=attendee.attendee_account_id).first()
        if not account:
            return jsonify({'message': 'Account does not exist'}), 404

        at_event = AttendeeAccountEvent.query.filter_by(attendee_account_id=account.id, event_id=next_event.id).first() is not None
        if not at_event:
            return jsonify({'message': 'Account does not have access to the current event'}), 403
        
    
    response, status_code = attendee_auth.login_attendee(attendee_account=account, password=password, event=next_event)
    
        
    return response, status_code

#------------------------------------------ GENRAL ------------------------------------------#

@bp.route('/accounts/me/attendees', methods=['GET'])
@attendee_login_required
def get_attendees_for_account():
    args = request.args.to_dict()
    args['attendee_account_id'] = str(attendee_auth.current_attendee().id)

    data = helper.filter_model_by_query_and_properties(Attendee, args)

    return jsonify(data)


#------------------------------------------ ATTENDEE SIGNUP ------------------------------------------#

@bp.route('/signups')
def get_attendee_signups():
    data = helper.filter_model_by_query_and_properties(AttendeeSignup, request.args)

    return jsonify(data)

@bp.route('/accounts/me/attendees/signups', methods=['GET'])
@attendee_login_required
def get_attendee_signups_for_account():
    data = helper.filter_model_by_query_and_properties(AttendeeSignup, request.args)

    return jsonify(data)

@bp.route('/accounts/me/attendees/<int:attendee_id>/signups', methods=['POST'])
@attendee_login_required
@protect_attendee_updates
def add_attendee_signup(attendee_id):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400

    event_id = data.get('event_id')
    session_id = data.get('session_id')

    if not event_id or not session_id:
        return jsonify({'message': 'No event_id and/or session_id provided'}), 400
    
    Event.query.filter_by(id=event_id).first_or_404()
    session = Session.query.filter_by(id=session_id).first_or_404()

    signup = AttendeeSignup.query.filter_by(event_id=event_id, attendee_id=attendee_id, session_id=session_id).first()
    if signup:
        return jsonify({'message': 'Booking Entry already exists'}), 400
    
    signup_count = AttendeeSignup.query.filter_by(event_id=event_id, session_id=session_id).count()
    if (signup_count >= session.capacity):
        return jsonify({'message': 'Session Full'}), 400
    
    signup = AttendeeSignup(event_id=event_id, attendee_id=attendee_id, session_id=session_id)

    db.session.add(signup)
    db.session.commit()

    return jsonify({
        'message': 'Attendee Workshop Booking Entry has been successfully added',
        'data': signup.to_dict()
    })

@bp.route('/accounts/me/attendees/<int:attendee_id>/signups/<int:session_id>', methods=['DELETE'])
@attendee_login_required
@protect_attendee_updates
def remove_attendee_signup(attendee_id, session_id):
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    event_id = data.get('event_id')

    if not event_id:
        abort(400, description="No event_id provided")
    
    Event.query.filter_by(id=event_id).first_or_404()
    Session.query.filter_by(id=session_id).first_or_404()

    signup = AttendeeSignup.query.filter_by(event_id=event_id, attendee_id=attendee_id, session_id=session_id).first_or_404()
    
    db.session.delete(signup)
    db.session.commit()

    return jsonify({
        'message': 'Volunteer Signup Entry has been successfully removed'
    })
