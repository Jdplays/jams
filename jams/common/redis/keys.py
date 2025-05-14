from enum import Enum

class RedisKeys(str, Enum):
    SERVER_VERSION = "server:version"
    WEB_VERSION = "web:version"
    JOLT_CONNECTION_STATUS = "jolt:connection_status"

class RedisChannels(str, Enum):
    WEBHOOK_TRIGGER = 'webhook:trigger'