import json
from uuid import uuid4
from sqlalchemy import and_, or_
from datetime import datetime, timedelta, UTC

from common.models import db, JOLTPrintQueue, JOLTHealthCheck, APIKey, APIKeyEndpoint, Endpoint
from common.util import helper
from common.util.enums import JOLTPrintQueueStatus, JOLTPrintJobType, JOLTRequestType, JOLTHealthCheckStatus, APIKeyType
from common.configuration import ConfigType, get_config_value
from common.integrations.jolt import last_healthcheck

from server import WSS

config_items = [
    ConfigType.JOLT_ENABLED,
    ConfigType.JOLT_API_KEY_ID
]

def config_dict():
    dict = {}
    for item in  config_items:
        dict[item.name] = get_config_value(item)
    
    return dict

# The main JOLT loop that will run when JOLT websocket clients are connected
def websocket_loop():
    process_print_queue()
    healthcheck_loop()

# A loop to send healthcheck to the JOLT clients
def healthcheck_loop():
    from common.models import db, JOLTHealthCheck
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
    from common.models import db, JOLTHealthCheck
    body = message['BODY']
    id = body['ID']
    healthcheck = JOLTHealthCheck.query.filter_by(id=id).first()
    if healthcheck:
        data = body['DATA']
        cpu = data['CPU']
        ram = data['RAM']
        ip = data['IP']
        storage = data['STORAGE']

        healthcheck.cpu_usage = float(cpu)
        healthcheck.ram_usage = float(ram)
        healthcheck.local_ip = ip
        healthcheck.storage_usage = float(storage)
        healthcheck.status = JOLTHealthCheckStatus.SUCCESS.name
        db.session.commit()

# A method that processes a JOLT print job status change
def process_job_status_update(message, status):
    body = message['BODY']
    id = body['ID']

    error = None
    if 'ERROR' in body:
        error = body['ERROR']
    print_job = JOLTPrintQueue.query.filter_by(id=id).first()
    if print_job:
        print_job.status = status.name
        print_job.error = error
        db.session.commit()

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