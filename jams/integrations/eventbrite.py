import requests
from flask import jsonify
from datetime import timedelta, datetime, time, UTC
from jams.configuration import ConfigType, get_config_value
from jams.models import db, Attendee, Event, TaskSchedulerModel, Webhook, ExternalAPILog, FireList
from jams.util.task_scheduler import TaskActionEnum, create_task
from jams.util.webhooks import WebhookActionEnum, WebhookOwnerEnum
from jams.util import helper
from jams.util.enums import AttendeeSource

base_url = 'https://www.eventbriteapi.com/v3'

configItems = [
    ConfigType.EVENTBRITE_BEARER_TOKEN,
    ConfigType.EVENTBRITE_ENABLED,
    ConfigType.EVENTBRITE_ORGANISATION_ID,
    ConfigType.EVENTBRITE_ORGANISATION_NAME,
    ConfigType.EVENTBRITE_CONFIG_EVENT_ID,
    ConfigType.EVENTBRITE_REGISTERABLE_TICKET_TYPES,
    ConfigType.EVENTBRITE_IMPORT_AGE,
    ConfigType.EVENTBRITE_IMPORT_AGE_FIELD,
    ConfigType.EVENTBRITE_IMPORT_GENDER
]

defaultHeaders = {
    'Authorization': ''
}

def send_eventbrite_api_request(path, method='GET', data=None, custom_token=None):
    # Set the Authorization header
    if custom_token:
        defaultHeaders['Authorization'] = f'Bearer {custom_token}'
    else:
        defaultHeaders['Authorization'] = f'Bearer {get_config_value(ConfigType.EVENTBRITE_BEARER_TOKEN)}'

    # Select the request method
    if method == 'GET':
        response = requests.get(f'{base_url}/{path}', headers=defaultHeaders)
    elif method == 'POST':
        response = requests.post(f'{base_url}/{path}', headers=defaultHeaders, json=data)
    elif method == 'DELETE':
        response = requests.delete(f'{base_url}/{path}', headers=defaultHeaders)
    else:
        raise ValueError(f'Unsupported method: {method}')
    
    # Log the api call
    log = ExternalAPILog(url=f'{base_url}/{path}', status_code=response.status_code)
    db.session.add(log)
    db.session.commit()

    # Check for successful response
    if response.status_code != 200:
        return None

    return response

def verify(custom_token=None):
    response = send_eventbrite_api_request('users/me/', custom_token=custom_token)

    if not response:
        return False
    
    return True

def get_organisations(custom_token=None):
    response = send_eventbrite_api_request('users/me/organizations/', custom_token=custom_token)

    orgainisationsJson = response.json()['organizations']
    orgainisations = []
    for org in orgainisationsJson:
        org = EventbriteOrgainisation(org['id'], org['name'], org['image_id'])
        orgainisations.append(org)
    
    return orgainisations

def retrive_media(media_id, width=20, height=20):
    response = send_eventbrite_api_request(f'media/{media_id}/?width={width}&height={height}')
    return response.text

def get_events(continuation_token=None):
    orgainisation_id = get_config_value(ConfigType.EVENTBRITE_ORGANISATION_ID)
    url = f'organizations/{orgainisation_id}/events/?order_by=start_desc'
    if continuation_token:
        url += f'&continuation={continuation_token}'

    response = send_eventbrite_api_request(url)

    if response.status_code != 200:
        return 'An Unexpected Error Occurred!'
    
    response_JSON = response.json()
    pagination_data = response_JSON.get('pagination')
    c_token = pagination_data.get('continuation')

    eventsJSON = response_JSON.get('events')
    events = []
    for event in eventsJSON:
        id = event['id']
        name = event['name']['text']
        description = event['description']['text']
        start_date_time = event['start']['utc']
        end_date_time = event['end']['utc']
        capacity = event['capacity']
        url = event['url']

        date = datetime.strptime(start_date_time, "%Y-%m-%dT%H:%M:%SZ").date()
        start = helper.convert_datetime_to_local_timezone(start_date_time)
        end = helper.convert_datetime_to_local_timezone(end_date_time)

        event = EventbriteEvent(id, name, description, date, start, end, capacity, url)
        events.append(event)
    
    if c_token:
        events.extend(get_events(c_token))
    
    return events

def create_event_update_tasks(event):
    event_datetime = datetime.combine(event.date, event.start_date_time.time())
    task_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    params_dict = {'event_id': event.id}
    # Create task that updates an events attendees every day from the day of creation to the day of the event
    create_task(name=f'update_attendees_for_upcoming_event_{event.id}', start_datetime=task_start, action_enum=TaskActionEnum.UPDATE_EVENTBRITE_EVENT_ATTENDEES, interval=timedelta(days=1), end_datetime=event_datetime, params=params_dict)

def deactivate_event_update_tasks(event):
    upcoming_task:TaskSchedulerModel = TaskSchedulerModel.query.filter_by(name=f'update_attendees_for_upcoming_event_{event.id}').first()
    today_task:TaskSchedulerModel = TaskSchedulerModel.query.filter_by(name=f'update_attendees_for_today_event_{event.id}').first()
    during_task:TaskSchedulerModel = TaskSchedulerModel.query.filter_by(name=f'update_attendees_for_today_during_event_{event.id}').first()

    if upcoming_task:
        upcoming_task.disable_task()

    if today_task:
        today_task.disable_task()

    if during_task:
        during_task.disable_task()

def sync_all_attendees_at_event(external_event_id, continuation_token=None):
    event = Event.query.filter_by(external_id=external_event_id).first()
    if not event:
        raise Exception('Requested event does not exist in the database')
    
    url = f'events/{external_event_id}/attendees'
    if continuation_token:
        url += f'?continuation={continuation_token}'

    response = send_eventbrite_api_request(url)

    response_JSON = response.json()
    attendees = response_JSON.get('attendees')
    pagination_data = response_JSON.get('pagination')
    c_token = pagination_data.get('continuation')

    for attendee in attendees:
        update_or_add_attendee_from_data(attendee)
    
    if c_token:
        return sync_all_attendees_at_event(external_event_id, c_token)
    else:
        return



def get_attendee_data(external_event_id, external_attendee_id):
    event = Event.query.filter_by(external_id=external_event_id).first()
    if not event:
        raise Exception('Requested event does not exist in the database')
    
    response = send_eventbrite_api_request(f'events/{external_event_id}/attendees/{external_attendee_id}')

    attendee_JSON = response.json()
    return attendee_JSON

def update_or_add_attendee_from_data(attendee_JSON):
    attendee_profile = attendee_JSON.get('profile')

    name = attendee_profile.get('name')
    email = attendee_profile.get('email')
    checked_in = attendee_JSON.get('checked_in')
    external_order_id = attendee_JSON.get('order_id')
    external_attendee_id = attendee_JSON.get('id')
    external_event_id = attendee_JSON.get('event_id')

    registerable = False
    ticket_type = attendee_JSON.get('ticket_class_name')
    registerable_ticket_types_text = get_config_value(ConfigType.EVENTBRITE_REGISTERABLE_TICKET_TYPES)
    if not registerable_ticket_types_text:
        registerable = True
    else:
        registerable_ticket_types = registerable_ticket_types_text.split(',')
        if ticket_type in registerable_ticket_types:
            registerable = True

    age = None
    if get_config_value(ConfigType.EVENTBRITE_IMPORT_AGE):
        answers = attendee_JSON.get('answers')
        for answer in answers:
            question = answer.get('question')
            if question == get_config_value(ConfigType.EVENTBRITE_IMPORT_AGE_FIELD):
                age_text = answer.get('answer')
                age = helper.try_parse_int(age_text)
    
    gender = None
    if get_config_value(ConfigType.EVENTBRITE_IMPORT_GENDER):
        gender = attendee_profile.get('gender')



    event = Event.query.filter_by(external_id=external_event_id).first()
    if not event:
        raise Exception('Requested event does not exist in the database')

    attendee = Attendee.query.filter_by(external_id=external_attendee_id).first()

    if not attendee:
        attendee = Attendee(name=name, email=email, external_order_id=external_order_id, external_id=external_attendee_id, event_id=event.id, registerable=registerable, age=age, gender=gender, source=AttendeeSource.EVENTBRITE.name)
        db.session.add(attendee)
        db.session.commit()
    else:
        if attendee.last_update_source == AttendeeSource.EVENTBRITE.name:
            attendee.name = name
            attendee.email = email
            attendee.registerable = registerable
            attendee.age = age
            attendee.gender = gender

            db.session.commit()
    
    if not attendee.checked_in and checked_in:
        attendee.check_in(source=AttendeeSource.EVENTBRITE)
    elif attendee.checked_in and not checked_in:
        attendee.check_out(source=AttendeeSource.EVENTBRITE)

    attendee.link_to_account()


def get_ticket_types(event_id=None):
    if not event_id:
        event_id = get_config_value(ConfigType.EVENTBRITE_CONFIG_EVENT_ID)
        if not event_id:
            return None
    
    response = send_eventbrite_api_request(f'events/{event_id}/ticket_classes')

    if not response:
        return
    
    response_JSON = response.json()

    ticket_classes_JSON = response_JSON.get('ticket_classes')
    ticket_classes = []

    for tt in ticket_classes_JSON:
        name = tt['name']
        description = tt['description']

        ett = EventbriteTicketType(name, description)

        ticket_classes.append(ett)
    
    return ticket_classes

def get_custom_questions(event_id=None):
    if not event_id:
        event_id = get_config_value(ConfigType.EVENTBRITE_CONFIG_EVENT_ID)
        if not event_id:
            return None
        
    response = send_eventbrite_api_request(f'events/{event_id}/questions')

    if not response:
        return
    
    response_JSON = response.json()
    questions_JSON = response_JSON.get('questions')

    questions = []

    for q_JSON in questions_JSON:
        q_question = q_JSON.get('question')
        text = q_question.get('text')
        questions.append(text)
    
    return questions

def eventbrite_config_dict():
    dict = {}
    for item in configItems:
        if item == ConfigType.EVENTBRITE_BEARER_TOKEN:
            continue
        dict[item.name] = get_config_value(item)
    
    return dict

def add_webhook_to_eventbrite(url, action):
    data = {
        'endpoint_url': url,
        'actions': action
    }

    response = send_eventbrite_api_request(f'organizations/{get_config_value(ConfigType.EVENTBRITE_ORGANISATION_ID)}/webhooks/', method='POST', data=data)

    json = response.json()
    webhook_id = json.get('id')
    return webhook_id

def deactivate_eventbrite_webhooks():
    webhooks = Webhook.query.filter_by(owner=WebhookOwnerEnum.EVENTBRITE.name, active=True).all()

    for webhook in webhooks:
        webhook.name = f'{webhook.name} - OLD'
        webhook.archive()
        db.session.commit()

def create_eventbrite_webhooks():
    deactivate_eventbrite_webhooks()

    
    checkin_webhook = Webhook(name=f'Eventbrite Check In - {get_config_value(ConfigType.EVENTBRITE_ORGANISATION_NAME)}', action_enum=WebhookActionEnum.EVENTBRITE_CHECK_IN.name, authenticated=False, owner=WebhookOwnerEnum.EVENTBRITE.name)
    db.session.add(checkin_webhook)


    checkout_webhook = Webhook(name=f'Eventbrite Check Out - {get_config_value(ConfigType.EVENTBRITE_ORGANISATION_NAME)}', action_enum=WebhookActionEnum.EVENTBRITE_CHECK_OUT.name, authenticated=False, owner=WebhookOwnerEnum.EVENTBRITE.name)
    db.session.add(checkout_webhook)
    
    checkin_webhook.activate()
    checkout_webhook.activate()

    checkin_webhook.log('created')
    checkout_webhook.log('created')

    # Api requests to add webhooks
    checkin_webhook_id = add_webhook_to_eventbrite(url=f'{get_config_value(ConfigType.APP_URL)}/api/v1/webhooks/{checkin_webhook.id}', action='attendee.checked_in')
    checkin_webhook.external_id = checkin_webhook_id

    checkout_webhook_id = add_webhook_to_eventbrite(url=f'{get_config_value(ConfigType.APP_URL)}/api/v1/webhooks/{checkout_webhook.id}', action='attendee.checked_out')
    checkout_webhook.external_id = checkout_webhook_id

    db.session.commit()


class EventbriteOrgainisation():
    id = str
    name = str
    image_id = str

    def __init__(self, id, name, image_id):
        self.id = id
        self.name = name
        self.image_id = image_id

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'image_id': self.image_id
        }
    
    def get_image(self, width=20, height=20):
        return retrive_media(self.image_id, width, height)
    

class EventbriteEvent():
    id = str
    name = str
    description = str
    date = datetime.date
    start_date_time = datetime.time
    end_date_time = datetime.time
    capacity = int
    url = str

    def __init__(self, id, name, description, date, start_date_time, end_date_time, capacity, url):
        self.id = id
        self.name = name
        self.description = description
        self.date = date
        self.start_date_time = start_date_time
        self.end_date_time = end_date_time
        self.capacity = capacity
        self.url = url

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'date': str(self.date),
            'start_date_time': str(self.start_date_time),
            'end_date_time': str(self.end_date_time),
            'capacity': self.capacity,
            'url': self.url
        }

class EventbriteTicketType():
    name = str
    description = str

    def __init__(self, name, description):
        self.name = name
        self.description = description

    def to_dict(self):
        return {
            'name': self.name,
            'description': self.description
        }
