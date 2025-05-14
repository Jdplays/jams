from.base import BaseConfig
import os

class WebConfig(BaseConfig):
    APP_TYPE = 'web'
    SECURITY_PASSWORD_SALT = os.environ.get( "SECURITY_PASSWORD_SALT", "ab3d3a0f6984c4f5hkao41509b097a7bd498e903f3c9b2eea667h16")
    SECURITY_REGISTERABLE = True
    SECURITY_POST_REGISTER_VIEW = '/private/dashboard'
    SECURITY_POST_LOGIN_VIEW = '/private/dashboard'
    SECURITY_PASSWORD_HASH = 'argon2'
    SECURITY_SEND_REGISTER_EMAIL = False
    SECURITY_TRACKABLE = True
    OAUTH_ENABLE = True