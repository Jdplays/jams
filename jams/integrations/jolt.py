import json
from enum import Enum
from sqlalchemy import and_, or_
from datetime import datetime, timedelta, UTC

from jams.models.integrations import JOLTHealthCheck
from jams.util import helper
from jams.util.enums import JOLTPrintQueueStatus, JOLTPrintJobType, JOLTRequestType, JOLTHealthCheckStatus, APIKeyType
from jams import WSS

# The main JOLT loop that will run when JOLT websocket clients are connected
def websocket_loop():
    process_print_queue()
    healthcheck_loop()

# A loop to sned healthchecks to the JOLT clients
def healthcheck_loop():
    from jams.models import db, JOLTHealthCheck
    try:
        now = datetime.now(UTC).replace(tzinfo=None)
        target_datetime = now - timedelta(seconds=30)
        
        outdated_healthchecks = JOLTHealthCheck.query.filter(JOLTHealthCheck.date_time <= target_datetime, JOLTHealthCheck.status == JOLTHealthCheckStatus.PENDING.name).all()

        for healthcheck in outdated_healthchecks:
            healthcheck.status = JOLTHealthCheckStatus.FAILED.name
        if outdated_healthchecks:
            db.session.commit()

        
        last_healthcheck = JOLTHealthCheck.query.order_by(JOLTHealthCheck.date_time.desc()).first()

        if not last_healthcheck or last_healthcheck.date_time <= target_datetime:
            new_healthcheck = JOLTHealthCheck()
            db.session.add(new_healthcheck)
            db.session.commit()

            message = build_healthcheck_request_message(new_healthcheck)
            WSS.notify_clients(message, APIKeyType.JOLT.name)
    except Exception as e:
        print(f'Error in healthcheck loop: {e}')

# The loop that processes the print queue
def process_print_queue():
    from jams.models import db, JOLTPrintQueue
    try:
        now = datetime.now(UTC).replace(tzinfo=None)
        target_datetime = now - timedelta(seconds=30)
        queued_print_jobs = JOLTPrintQueue.query.filter(
            and_(
                JOLTPrintQueue.status == JOLTPrintQueueStatus.QUEUED.name,
                JOLTPrintQueue.retry_attempts_left > 0,
                or_(
                    JOLTPrintQueue.last_attempt_date_time == None,
                    JOLTPrintQueue.last_attempt_date_time <= target_datetime
                )
            )
        ).all()

        for job in queued_print_jobs:
            message = build_print_request_message(job)
            WSS.notify_clients(message, APIKeyType.JOLT.name)
            job.last_attempt_date_time = datetime.now(UTC)
            job.retry_attempts_left = job.retry_attempts_left - 1

            if job.retry_attempts_left <= 0:
                job.status = JOLTPrintQueueStatus.FAILED.name
            db.session.commit()
    except Exception as e:
        print(f"Error in process_queue: {e}")

# A method that processes an message sent by a JOLT client
def process_request(message):
    type = message['TYPE']
    print(type)
    match type:
        case JOLTRequestType.PRINT_JOB_RECEIVED.name:
            process_job_status_update(message, JOLTPrintQueueStatus.RECEIVED)
        case JOLTRequestType.PRINT_JOB_COMPLETED.name:
            print('Completed')
            process_job_status_update(message, JOLTPrintQueueStatus.PRINTED)
        case JOLTRequestType.PRINT_JOB_ERROR.name:
            print('Error')
            process_job_status_update(message, JOLTPrintQueueStatus.FAILED)
        case JOLTRequestType.HEALTHCHECK_RESPONSE.name:
            process_healthcheck_response(message)

# A method that processes a JOLT healthcheck response
def process_healthcheck_response(message):
    from jams.models import db, JOLTHealthCheck
    body = message['BODY']
    id = body['ID']
    healthcheck = JOLTHealthCheck.query.filter_by(id=id).first()
    if healthcheck:
        data = body['DATA']
        cpu = data['CPU']
        ram = data['RAM']
        ip = data['IP']
        storage = data['STORAGE']
        error = data['ERROR']

        healthcheck.cpu_usage = float(cpu)
        healthcheck.ram_usage = float(ram)
        healthcheck.local_ip = ip
        healthcheck.storage_usage = float(storage)
        healthcheck.status = JOLTHealthCheckStatus.SUCCESS.name
        healthcheck.error = error
        db.session.commit()

# A method that processes a JOLT print job status change
def process_job_status_update(message, status):
    from jams.models import db, JOLTPrintQueue
    body = message['BODY']
    id = body['ID']
    print_job = JOLTPrintQueue.query.filter_by(id=id).first()
    if print_job:
        print_job.status = status.name
        db.session.commit()

# A method that checks if the JOLT print queue is open and can be added to
def print_queue_open():
    healthcheck, online = last_healthcheck()
    if online:
        return True

    next_event = helper.get_next_event()
    now = datetime.now(UTC)

    event_date = next_event.date.date()
    before_event = next_event.start_date_time - timedelta(hours=2)
    after_event = next_event.end_date_time + timedelta(hours=2)

    if now.date() == event_date and (now >= before_event and now <= after_event):
        return True
    
    return False


# Adds an attendee to the JOLT print queue
def add_attendee_to_print_queue(attendee):
    if not print_queue_open():
        return (False, 'Print Queue is not currently open')
    
    from jams.models import db, JOLTPrintQueue
    existing_jobs = JOLTPrintQueue.query.filter(
        and_(
            JOLTPrintQueue.type == JOLTPrintJobType.ATTENDEE_LABEL.name,
            JOLTPrintQueue.data['attendee_id'].as_integer() == attendee.id,
            JOLTPrintQueue.status == JOLTPrintQueueStatus.QUEUED.name
        )
    ).all()

    if existing_jobs:
        return (False, 'Another print for this attendee is in the queue')

    body = {
        'attendee_id': attendee.id,
        'event_id': attendee.event_id,
        'name': attendee.name
    }

    print_job = JOLTPrintQueue(body, JOLTPrintJobType.ATTENDEE_LABEL.name)
    db.session.add(print_job)
    db.session.commit()

    return (True, 'Attendee label successfully added to queue')

# Adds an attendee to the JOLT print queue
def add_test_to_print_queue():
    if not print_queue_open():
        return (False, 'Print Queue is not currently open')
    
    from jams.models import db, JOLTPrintQueue
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

# A method that builds a print request message for JOLT
def build_print_request_message(print_job):
    message = {
        'TYPE': JOLTRequestType.PRINT_JOB_REQUEST.name,
        'BODY': {
            'TYPE': print_job.type,
            'ID': str(print_job.id),
            'DATA': print_job.data
        }
    }
    return json.dumps(message)

def build_healthcheck_request_message(healthcheck):
    message = {
        'TYPE': JOLTRequestType.HEALTHCHECK_REQUEST.name,
        'BODY': {
            'ID': str(healthcheck.id)
        }
    }

    return json.dumps(message)


def last_healthcheck():
    now = datetime.now(UTC).replace(tzinfo=None)
    target_datetime = now - timedelta(seconds=35)
    last_healthcheck = JOLTHealthCheck.query.filter(JOLTHealthCheck.date_time >= target_datetime).first()

    online = False
    if last_healthcheck and last_healthcheck.status == JOLTHealthCheckStatus.SUCCESS.name:
        online = True
    
    if len(WSS.connected_clients[APIKeyType.JOLT.name]) == 0:
        online = False

    return (last_healthcheck, online)