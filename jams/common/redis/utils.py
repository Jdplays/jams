from common.extensions import redis_client as client
from common.redis.keys import RedisKeys

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

