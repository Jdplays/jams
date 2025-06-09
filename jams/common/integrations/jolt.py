from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import and_

from common.models import db, JOLTHealthCheck, APIKey, APIKeyEndpoint, Endpoint, JOLTPrintQueue
from common.util.enums import APIKeyType, JOLTHealthCheckStatus, JOLTPrintJobType, JOLTPrintQueueStatus
from common.util import helper
from common.redis import utils


def last_healthcheck():
    now = datetime.now(UTC).replace(tzinfo=None)
    target_datetime = now - timedelta(seconds=40)
    last_healthcheck = JOLTHealthCheck.query.filter(JOLTHealthCheck.date_time >= target_datetime).first()

    online = False
    if last_healthcheck and last_healthcheck.status == JOLTHealthCheckStatus.SUCCESS.name:
        online = True
    
    if utils.get_jolt_status() == 'offline':
        online = False

    return (last_healthcheck, online)

# A method that checks if the JOLT print queue is open and can be added to
def print_queue_open():
    healthcheck, online = last_healthcheck()
    if online:
        return True

    next_event = helper.get_next_event()
    now = datetime.now(UTC)

    event_date = next_event.date.date()
    before_event = next_event.start_date_time.replace(tzinfo=UTC) - timedelta(hours=2)
    after_event = next_event.end_date_time.replace(tzinfo=UTC) + timedelta(hours=2)

    if now.date() == event_date and (now >= before_event and now <= after_event):
        return True
    
    return False


# Adds an attendee to the JOLT print queue
def add_attendee_to_print_queue(attendee):
    if not print_queue_open():
        return (False, 'Print Queue is not currently open')
    
    attendee.label_printed = True
    
    existing_jobs = JOLTPrintQueue.query.filter(
        and_(
            JOLTPrintQueue.type == JOLTPrintJobType.ATTENDEE_LABEL.name,
            JOLTPrintQueue.data['attendee_id'].as_integer() == attendee.id,
            JOLTPrintQueue.status == JOLTPrintQueueStatus.QUEUED.name
        )
    ).all()

    if existing_jobs:
        return (False, 'Another print for this attendee is in the queue')
    
    magic_link = helper.create_attendee_magic_link(attendee.attendee_account.id, attendee.event_id)

    body = {
        'attendee_id': attendee.id,
        'event_id': attendee.event_id,
        'name': attendee.name,
        'qr_url': magic_link.url
    }

    print_job = JOLTPrintQueue(body, JOLTPrintJobType.ATTENDEE_LABEL.name)
    db.session.add(print_job)
    db.session.commit()

    return (True, 'Attendee label successfully added to queue')

# Adds an attendee to the JOLT print queue
def add_test_to_print_queue():
    if not print_queue_open():
        return (False, 'Print Queue is not currently open')
    
    existing_jobs = JOLTPrintQueue.query.filter(
        and_(
            JOLTPrintQueue.type == JOLTPrintJobType.TEST_ATTENDEE_LABEL.name,
            JOLTPrintQueue.status == JOLTPrintQueueStatus.QUEUED.name
        )
    ).all()

    if existing_jobs:
        return (False, 'Another "Print Test" is in the queue')

    body = {}

    print_job = JOLTPrintQueue(body, JOLTPrintJobType.TEST_ATTENDEE_LABEL.name)
    db.session.add(print_job)
    db.session.commit()

    return (True, '"Print Test" Successfully queued')


def generate_api_token():
    next_event_endpoint = Endpoint.query.filter_by(name='get_next_event_id').first()
    event_field_endpoint = Endpoint.query.filter_by(name='get_event_field').first()
    event_attendees_endpoint = Endpoint.query.filter_by(name='get_event_attendees').first()

    # If any of the endpoint checks fail, abort
    if not next_event_endpoint or not event_field_endpoint or not event_attendees_endpoint:
        return (None, None)
    
    endpoint_ids = [next_event_endpoint.id, event_field_endpoint.id, event_attendees_endpoint.id]

    # Clean up old api tokens for JOLT
    disable_old_api_tokens()

    # Create new API Key
    key = uuid4().hex
    new_api_token_obj = APIKey(key=key, type=APIKeyType.JOLT.name, websocket=True)
    db.session.add(new_api_token_obj)

    db.session.commit()

    # Assign endpoints to new API key
    for id in endpoint_ids:
        endpoint_link = APIKeyEndpoint(api_key_id=new_api_token_obj.id, endpoint_id=id)
        db.session.add(endpoint_link)
    
    db.session.commit()

    return (new_api_token_obj.id, key)

def disable_old_api_tokens():
    old_api_tokens = APIKey.query.filter_by(type=APIKeyType.JOLT.name, active=True).all()

    for token in old_api_tokens:
        token.active = False

    db.session.commit()