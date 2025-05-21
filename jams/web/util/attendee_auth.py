

from flask import abort, jsonify, session
from datetime import datetime, UTC

from common.models import AttendeeAccount, AttendeeMagicLink
from common.util import helper


def login_attendee(attendee_account, password, event):
    if not attendee_account:
        abort(500)
    
    if event.password != password:
        return jsonify({'message': 'Invalid Password'}), 403
    
    session['attendee_account_id'] = attendee_account.id

    return jsonify({'message': 'Successfully Logged In'}), 200

def login_attendee_magic(magic_link_id):
    magic_link = AttendeeMagicLink.query.filter_by(id=magic_link_id).first()
    if not magic_link:
        abort(500)
    
    next_event = helper.get_next_event()

    if magic_link.event_id != next_event.id:
        return jsonify({'message': 'Invalid magic link'}), 403
    
    if not verify_magic_link(magic_link):
        return jsonify({'message': 'Invalid magic link'}), 403
    
    session['attendee_account_id'] = magic_link.attendee_account.id

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

def verify_magic_link(magic_link):
    if not magic_link:
        return False

    now = datetime.now(UTC).replace(tzinfo=None)
    if magic_link.expires_at < now:
        return False
    
    if magic_link.created_at > now:
        return False
    
    return True