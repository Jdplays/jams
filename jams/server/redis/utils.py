from common.extensions import redis_client as client
from common.redis.keys import RedisKeys

def set_jolt_status(online=False):
    status = 'offline'
    if online:
        status = 'online'
    
    client.set(RedisKeys.JOLT_CONNECTION_STATUS, status)