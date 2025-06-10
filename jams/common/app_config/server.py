from.base import BaseConfig

class ServerConfig(BaseConfig):
    APP_TYPE = 'server'
    SECURITY_PASSWORD_SINGLE_HASH = 'argon2'
