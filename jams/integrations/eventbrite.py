import requests
from datetime import timedelta, datetime, time, UTC
from jams.configuration import ConfigType, get_config_value
from jams.models import db, Attendee, Event, TaskSchedulerModel
from jams.util.task_scheduler import TaskActionEnum, create_task

base_url = 'https://www.eventbriteapi.com/v3'
#base_url = 'https://private-anon-60974f3b0d-eventbriteapiv3public.apiary-mock.com/v3' # This is just the mock server and should be updated later.

configItems = [
    ConfigType.EVENTBRITE_BEARER_TOKEN,
    ConfigType.EVENTBRITE_ENABLED,
    ConfigType.EVENTBRITE_ORGANISATION_ID,
    ConfigType.EVENTBRITE_ORGANISATION_NAME,
    ConfigType.EVENTBRITE_CONFIG_EVENT_ID,
    ConfigType.EVENTBRITE_REGISTERABLE_TICKET_TYPES,
    ConfigType.EVENTBRITE_IMPORT_AGE,
    ConfigType.EVENTBRITE_IMPORT_AGE_FIELD
]

defaultHeaders = {
    'Authorization': ''
}

def send_eventbrite_api_request(path, custom_token=None):
    if custom_token:
        defaultHeaders['Authorization'] = f'Bearer {custom_token}'
    else:
        defaultHeaders['Authorization'] = f'Bearer {get_config_value(ConfigType.EVENTBRITE_BEARER_TOKEN)}'
    response = requests.get(f'{base_url}/{path}', headers=defaultHeaders)

    if response.status_code != 200:
        return None
    
    return response


def verify(custom_token=None):
    response = send_eventbrite_api_request('users/me/', custom_token)

    if not response:
        return False
    
    return True

def get_organisations(custom_token=None):
    response = send_eventbrite_api_request('users/me/organizations/', custom_token)

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
        start_date_time = datetime.strptime(event['start']['utc'], "%Y-%m-%dT%H:%M:%SZ")
        end_date_time = datetime.strptime(event['end']['utc'], "%Y-%m-%dT%H:%M:%SZ")
        capacity = event['capacity']
        url = event['url']

        date = start_date_time.date()
        start = start_date_time.time()
        end = end_date_time.time()
        event = EventbriteEvent(id, name, description, date, start, end, capacity, url)
        events.append(event)
    
    if c_token:
        events.extend(get_events(c_token))
    
    return events

def create_event_update_tasks(event):
    midnight = time(00, 00, 00)
    event_datetime = datetime.combine(event.date, midnight)
    task_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    params_dict = {'event_id': event.id}
    # Create task that updates an events attendees every day from the day of creation to the day of the event
    create_task(name=f'update_attendees_for_upcoming_event_{event.id}', start_datetime=task_start, action_enum=TaskActionEnum.UPDATE_EVENTBRITE_EVENT_ATTENDEES, interval=timedelta(days=1), end_datetime=event_datetime, params=params_dict)
    # Craete task that updates an events attendees every hour during the day of the event
    create_task(name=f'update_attendees_for_today_event_{event.id}', start_datetime=event_datetime, action_enum=TaskActionEnum.UPDATE_EVENTBRITE_EVENT_ATTENDEES, interval=timedelta(hours=1), end_datetime=(event_datetime+timedelta(days=1)), params=params_dict)

def deactivate_event_update_tasks(event):
    upcoming_task:TaskSchedulerModel = TaskSchedulerModel.query.filter_by(name=f'update_attendees_for_upcoming_event_{event.id}').first()
    today_task:TaskSchedulerModel = TaskSchedulerModel.query.filter_by(name=f'update_attendees_for_today_event_{event.id}').first()

    if upcoming_task:
        upcoming_task.disable_task()

    if today_task:
        today_task.disable_task()

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

    event = Event.query.filter_by(external_id=external_event_id).first()
    if not event:
        raise Exception('Requested event does not exist in the database')

    attendee = Attendee.query.filter_by(external_id=external_attendee_id).first()

    if not attendee:
        attendee = Attendee(name=name, email=email, checked_in=checked_in, external_order_id=external_order_id, external_id=external_attendee_id, event_id=event.id)
        db.session.add(attendee)
        db.session.commit()
    else:
        attendee.name = name
        attendee.email = email
        attendee.checked_in = checked_in

        db.session.commit()

def get_ticket_types(event_id=None):
    if not event_id:
        event_id = get_config_value(ConfigType.EVENTBRITE_CONFIG_EVENT_ID)
        if not event_id:
            return None
    
    response = send_eventbrite_api_request(f'events/{event_id}/ticket_classes')

    if response.status_code != 200:
        return 'An Unexpected Error Occurred!'
    
    response_JSON = response.json()

    ticket_classes_JSON = response_JSON.get('ticket_classes')
    ticket_classes = []

    for tt in ticket_classes_JSON:
        name = tt['name']
        description = tt['description']

        ett = EventbriteTicketType(name, description)

        ticket_classes.append(ett)
    
    return ticket_classes

def eventbrite_config_dict():
    dict = {}
    for item in configItems:
        dict[item.name] = get_config_value(item)
    
    return dict


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
    start_time = datetime.time
    end_time = datetime.time
    capacity = int
    url = str

    def __init__(self, id, name, description, date, start_time, end_time, capacity, url):
        self.id = id
        self.name = name
        self.description = description
        self.date = date
        self.start_time = start_time
        self.end_time = end_time
        self.capacity = capacity
        self.url = url

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'date': str(self.date),
            'start_time': str(self.start_time),
            'end_time': str(self.end_time),
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
