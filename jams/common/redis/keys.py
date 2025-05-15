from enum import Enum

class RedisKeys(str, Enum):
    SERVER_VERSION = "server:version"
    WEB_VERSION = "web:version"
    JOLT_CONNECTION_STATUS = "jolt:connection_status"
    DISCORD_BOT_STATUS = 'discordbot:status'
    DISCORD_BOT_CONFIG = 'discordbot:config'

class RedisChannels(str, Enum):
    WEBHOOK_TRIGGER = 'webhook:trigger'
    DISCORD_BOT_CONTROL = 'discordbot:control'
    DISCORD_BOT_ACTION = 'discordbot:action'
    DISCORD_BOT_SEND_MESSAGE ='discordbot:send_message'