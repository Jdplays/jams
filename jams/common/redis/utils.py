import json

from common.extensions import redis_client as client
from common.redis.keys import RedisKeys, RedisChannels
from common.util.enums import DiscordRecipientType, DiscordMessageType, DiscordMessageView

def set_app_version(type='server', version='unknown'):
    key = RedisKeys.SERVER_VERSION
    if type == 'web':
        key = RedisKeys.WEB_VERSION
    
    client.set(key, version)

def get_app_version(type='server'):
    key = RedisKeys.SERVER_VERSION
    if type == 'web':
        key = RedisKeys.WEB_VERSION
    return client.get(key)

def get_jolt_status():
    key = RedisKeys.JOLT_CONNECTION_STATUS
    return client.get(key)

def get_discord_bot_status():
    raw = client.get(RedisKeys.DISCORD_BOT_STATUS)
    if not raw:
        return {}
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}

def get_discord_bot_config():
    raw = client.get(RedisKeys.DISCORD_BOT_CONFIG)
    if not raw:
        return {}
    
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}
    
def discord_bot_control(start:bool=None, config:dict=None):
    payload = {}
    if start is not None:
        payload['action'] = 'start' if start else 'stop'
    
    if config is not None:
        payload['config'] = config

    client.publish(RedisChannels.DISCORD_BOT_CONTROL, json.dumps(payload))

def discord_bot_action(action_name:str, data:dict=None):
    payload = {
        'action': action_name
    }

    if data is not None:
        payload['data'] = data
    
    client.publish(RedisChannels.DISCORD_BOT_ACTION, json.dumps(payload))

def discord_bot_send_message(message, message_type:DiscordMessageType, channel_id=None, user_id=None, view_type:DiscordMessageView=None, view_data=None, event_id=None):
    if (channel_id is not None) and (user_id is not None):
        raise ValueError('Only one of channel_id or user_id can be provided, not both.')
    if (channel_id is None) and (user_id is None):
        raise ValueError('You must provide either channel_id or user_id')
    
    payload = {}
    data = {}

    if channel_id is not None:
        payload['recipient_type'] = DiscordRecipientType.CHANNEL.name
        data['channel_id'] = channel_id
    else:
        payload['recipient_type'] = DiscordRecipientType.DM.name
        data['user_id'] = user_id
    
    data.update({
        'message': message,
        'message_type': message_type.name,
    })

    if view_type is not None:
        data.update({
            'message_view': view_type.name,
            'view_data': view_data
        })
    
    if event_id is not None:
        data['event_id'] = event_id
    
    payload['data'] = data
    
    client.publish(RedisChannels.DISCORD_BOT_SEND_MESSAGE, json.dumps(payload))

def discord_bot_update_message(message_db_id, expired=False, new_content=None, new_view_type:DiscordMessageView=None, new_message_type:DiscordMessageType=None, active=True):
    payload = {
        'message_db_id': str(message_db_id),
        'expired': expired,
        'active': active
    }

    if new_content:
        payload['new_content'] = new_content

    if new_view_type:
        payload['new_view_type'] = new_view_type.name

    if new_message_type:
        payload['new_message_type'] = new_message_type.name
    
    client.publish(RedisChannels.DISCORD_BOT_UPDATE_MESSAGE, json.dumps(payload))

        