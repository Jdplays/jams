import requests
from datetime import datetime
from jams.configuration import ConfigType, get_config_value

#base_url = 'https://www.eventbriteapi.com/v3'
base_url = 'https://private-anon-60974f3b0d-eventbriteapiv3public.apiary-mock.com/v3' # This is just the mock server and should be updated later.

configItems = [
    ConfigType.EVENTBRITE_BEARER_TOKEN,
    ConfigType.EVENTBRITE_ENABLED,
    ConfigType.EVENTBRITE_ORGANISATION_ID,
    ConfigType.EVENTBRITE_ORGANISATION_NAME
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

def get_events():
    orgainisation_id = get_config_value(ConfigType.EVENTBRITE_ORGANISATION_ID)
    response = send_eventbrite_api_request(f'organizations/{orgainisation_id}/events/?order_by=start_desc')

    if response.status_code != 200:
        return 'An Unexpected Error Occurred!'
    
    eventsJSON = response.json()['events']
    events = []
    for event in eventsJSON:
        id = event['id']
        name = event['name']['text']
        description = event['description']['text']
        start_date_time = datetime.strptime(event['start']['local'], "%Y-%m-%dT%H:%M:%S")
        end_date_time = datetime.strptime(event['end']['local'], "%Y-%m-%dT%H:%M:%S")
        capacity = event['capacity']
        url = event['url']

        date = start_date_time.date()
        start = start_date_time.time()
        end = end_date_time.time()
        event = EventbriteEvent(id, name, description, date, start, end, capacity, url)
        events.append(event)
    
    return events


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

