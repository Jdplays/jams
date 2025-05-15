import json

from common.extensions import redis_client as client
from common.redis.keys import RedisKeys, RedisChannels

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
        