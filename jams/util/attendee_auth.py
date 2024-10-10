

from flask import abort, jsonify, session
from jams.models import AttendeeAccount


def login_attendee(attendee_account, password, event):
    if not attendee_account:
        abort(500)
    
    if event.password != password:
        return jsonify({'message': 'Invalid Password'}), 403
    
    session['attendee_account_id'] = attendee_account.id

    return jsonify({'message': 'Successfully Logged In'}), 200


def logout_attendee():
    session.pop('attendee_account_id', None)

def is_authenticated():
    if 'attendee_account_id' not in session:
        return False
    return True

def current_attendee():
    if not is_authenticated():
        return None
    
    attendee_account_id = session['attendee_account_id']

    account = AttendeeAccount.query.filter_by(id=attendee_account_id).first()

    if not account:
        return None
    
    return account