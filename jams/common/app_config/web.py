from.base import BaseConfig

class WebConfig(BaseConfig):
    APP_TYPE = 'web'
    SECURITY_POST_REGISTER_VIEW = '/private/dashboard'
    SECURITY_POST_LOGIN_VIEW = '/private/dashboard'
    SECURITY_SEND_REGISTER_EMAIL = False
    OAUTH_ENABLE = True