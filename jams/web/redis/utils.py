import json

from common.extensions import redis_client as client
from common.redis.keys import RedisChannels

def trigger_webhook(webhook_id:str, payload:dict):
    client.publish(RedisChannels.WEBHOOK_TRIGGER, json.dumps({
        'webhook_id': str(webhook_id),
        'data': payload
    }))