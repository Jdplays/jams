from enum import Enum
from jams.models import db, Config

class ConfigType(Enum):
    EVENTBRITE_ENABLED = 'EVENTBRITE_ENABLED'
    EVENTBRITE_BEARER_TOKEN = 'EVENTBRITE_BEARER_TOKEN'
    EVENTBRITE_ORGANISATION_ID = 'EVENTBRITE_ORGANISATION_ID'
    EVENTBRITE_ORGANISATION_NAME = 'EVENTBRITE_ORGANISATION_NAME'



def get_config_value(key:ConfigType):
    config = Config.query.filter_by(key=key.value).first()
    if not config:
        return None
    return config.value

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