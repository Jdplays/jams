from enum import Enum
from typing import Union

from sqlalchemy import exists
from jams.models import db, Config

class ConfigType(Enum):
    HMAC_SECRET_KEY = 'HMAC_SECRET_KEY'
    EVENTBRITE_ENABLED = 'EVENTBRITE_ENABLED'
    EVENTBRITE_BEARER_TOKEN = 'EVENTBRITE_BEARER_TOKEN'
    EVENTBRITE_ORGANISATION_ID = 'EVENTBRITE_ORGANISATION_ID'
    EVENTBRITE_ORGANISATION_NAME = 'EVENTBRITE_ORGANISATION_NAME'
    EVENTBRITE_WEBHOOKS_ENABLED = 'EVENTBRITE_WEBHOOKS_ENABLED'
    EVENTBRITE_CONFIG_EVENT_ID = 'EVENTBRITE_CONFIG_EVENT_ID'
    EVENTBRITE_REGISTERABLE_TICKET_TYPES = 'EVENTBRITE_REGISTERABLE_TICKET_TYPES'
    EVENTBRITE_IMPORT_AGE = 'EVENTBRITE_IMPORT_AGE'
    EVENTBRITE_IMPORT_AGE_FIELD = 'EVENTBRITE_IMPORT_AGE_FIELD'
    EVENTBRITE_IMPORT_GENDER = 'EVENTBRITE_IMPORT_GENDER'
    LOCAL_AUTH_ENABLED = 'LOCAL_AUTH_ENABLED'
    OAUTH_ENABLED = 'OAUTH_ENABLED'
    OAUTH_PROVIDER_NAME = 'OAUTH_PROVIDER_NAME'
    OAUTH_DISCOVERY_DOCUMENT_URL = 'OAUTH_DISCOVERY_DOCUMENT_URL'
    OAUTH_CLIENT_ID = 'OAUTH_CLIENT_ID'
    OAUTH_CLIENT_SECRET = 'OAUTH_CLIENT_SECRET'
    APP_URL = 'APP_URL'
    HTTP_SCHEME = 'HTTP_SCHEME'
    TIMEZONE = 'TIMEZONE',
    JOLT_ENABLED = 'JOLT_ENABLED',
    JOLT_API_KEY_ID = 'JOLT_API_KEY_ID'
    STREAKS_ENABLED = 'STREAKS_ENABLED'


def config_entry_exists(key:Union[str, ConfigType]):
    try:
        config_type = ConfigType[key] if isinstance(key, str) else key
    except KeyError:
        raise ValueError(f"Invalid config type: {key}")
    
    return bool(db.session.query(exists().where(Config.key == config_type.value)).scalar())

def get_config_value(key:Union[str, ConfigType]):
    try:
        config_type = ConfigType[key] if isinstance(key, str) else key
    except KeyError:
        raise ValueError(f"Invalid config type: {key}")
    
    config = Config.query.filter_by(key=config_type.value).first()

    if not config:
        return None
    else:
        if not config.value:
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