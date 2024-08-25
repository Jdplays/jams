import requests
from jams.configuration import ConfigType

#base_url = 'https://www.eventbriteapi.com/v3'
base_url = 'https://private-anon-60974f3b0d-eventbriteapiv3public.apiary-mock.com/v3' # This is just the mock server and should be updated later.
token = '' # No token is needed for the mock server. This should also not be hard coded and should be configurable from settings
configItems = [
    ConfigType.EVENTBRITE_BEARER_TOKEN,
    ConfigType.EVENTBRITE_ENABLED,
    ConfigType.EVENTBRITE_ORGANISATION_ID,
    ConfigType.EVENTBRITE_ORGANISATION_NAME
]

defaultHeaders = {
    'Authorization': f'Bearer {token}'
}

def verify(private_token=None):
    if private_token:
        defaultHeaders['Authorization'] = f'Bearer {private_token}'
    
    
    response = requests.get(f'{base_url}/users/me/', headers=defaultHeaders)

    if response.status_code != 200:
        return False
    
    return True

def get_organisations(private_token=None):
    if private_token:
        defaultHeaders['Authorization'] = private_token

    response = requests.get(f'{base_url}/users/me/organizations/', headers=defaultHeaders)

    if response.status_code != 200:
        return 'An Unexpected Error Occurred!'

    orgainisationsJson = response.json()['organizations']
    orgainisations = []
    for org in orgainisationsJson:
        org = Orgainisation(org['id'], org['name'], org['image_id'])
        orgainisations.append(org)
    
    return orgainisations

def retrive_media(media_id, width=20, height=20):
    response = requests.get(f'{base_url}/media/{media_id}/?width={width}&height={height}')
    return response.text


class Orgainisation():
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
