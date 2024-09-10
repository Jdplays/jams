from enum import Enum
from typing import Union
from jams.models import db, Config

class ConfigType(Enum):
    EVENTBRITE_ENABLED = 'EVENTBRITE_ENABLED'
    EVENTBRITE_BEARER_TOKEN = 'EVENTBRITE_BEARER_TOKEN'
    EVENTBRITE_ORGANISATION_ID = 'EVENTBRITE_ORGANISATION_ID'
    EVENTBRITE_ORGANISATION_NAME = 'EVENTBRITE_ORGANISATION_NAME'
    LOCAL_AUTH_ENABLED = 'LOCAL_AUTH_ENABLED'
    OAUTH_ENABLED = 'OAUTH_ENABLED'
    OAUTH_PROVIDER_NAME = 'OAUTH_PROVIDER_NAME'
    OAUTH_DISCOVERY_DOCUMENT_URL = 'OAUTH_DISCOVERY_DOCUMENT_URL'
    OAUTH_CLIENT_ID = 'OAUTH_CLIENT_ID'
    OAUTH_CLIENT_SECRET = 'OAUTH_CLIENT_SECRET'
    APP_URL = 'APP_URL'
    HTTP_SCHEME = 'HTTP_SCHEME'



def get_config_value(key:Union[str, ConfigType]):
    if  isinstance(key, str):
        config_type = ConfigType[key]
    else:
        config_type = key
    config = Config.query.filter_by(key=config_type.value).first()

    if not config:
        return None
    
    config_value = config.value.strip()

    if config_value.lower() in ['true', 'false']:
        return config_value == 'true'
    
    return config_value

def set_config_value(key:ConfigType, value):
    config = Config.query.filter_by(key=key.value).first()
    if not config:
        return create_config_entry(key, value)
    
    config.value = value
    db.session.commit()
    

def create_config_entry(key:ConfigType, value, private=True):
    config = Config.query.filter_by(key=key.value).first()
    if config:
        return set_config_value(key, value)
    
    config = Config(key=key.value, value=value, private=private)
    db.session.add(config)
    db.session.commit()

def remove_config_entry(key:ConfigType):
    config = Config.query.filter_by(key=key.value).first()
    if not config:
        return
    db.session.delete(config)
    db.session.commit()