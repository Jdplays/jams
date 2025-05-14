import json

from common.extensions import redis_client as client
from common.extensions import get_logger

class RedisRouter:
    def __init__(self, channels: list[str], pattern: bool = False):
        self.channels = channels
        self.handlers = {}
        self.pattern = pattern
        self.pubsub = client.pubsub()
        self.app = None
        self.logger = get_logger('RedisRouter')
    
    def init_app(self, app):
        self.app = app

    def register(self, channel:str, handler):
        self.handlers[channel] = handler

    def start(self):
        if not self.app:
            self.logger.error('No Application context provided. Unable to start. Please make sure to run router.init_app(app) before starting.')
            return
        
        self.logger.info('Starting Redis Router...')

        subscribe = self.pubsub.psubscribe if self.pattern else self.pubsub.subscribe
        subscribe(*self.channels)

        for message in self.pubsub.listen():
            if message['type'] != 'message' and message['type'] != 'pmessage':
                continue

            channel = message.get('channel') or message.get('pattern')
            data = message['data']

            if isinstance(channel, bytes):
                channel = channel.decode()
            if isinstance(data, bytes):
                data = data.decode()
            
            handler = self.handlers.get(channel)
            if handler:
                try:
                    with self.app.app_context():
                        payload = json.loads(data)
                        handler(payload)
                except Exception as e:
                    self.logger.error(f'Error handling {channel}: {e}')