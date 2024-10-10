# API is for serving data to Typscript/Javascript
from flask import Blueprint, redirect, request, jsonify, abort, session, url_for
from jams.models import db, AttendeeAccount, AttendeeAccountEvent, Attendee
from jams.util import helper, attendee_auth
from jams.decorators import attendee_login_required

bp = Blueprint('attendee', __name__, url_prefix='/attendee')

# URL PREFIX = /api/v1/attendee

#------------------------------------------ AUTH ------------------------------------------#
@bp.route('/login', methods=['POST'])
def login():
    if 'attendee_id' in session:
        return redirect(url_for('routes.frontend.public.attendee.workshop_booking'))
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

