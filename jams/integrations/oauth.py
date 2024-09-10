from flask import current_app
from jams import oauth
from jams.configuration import ConfigType, get_config_value

configItems = [
    ConfigType.LOCAL_AUTH_ENABLED,
    ConfigType.OAUTH_ENABLED,
    ConfigType.OAUTH_PROVIDER_NAME,
    ConfigType.OAUTH_DISCOVERY_DOCUMENT_URL,
    ConfigType.OAUTH_CLIENT_ID,
    ConfigType.OAUTH_CLIENT_SECRET
]

def setup_oauth():
    if get_config_value(ConfigType.OAUTH_ENABLED):
        oauth.init_app(current_app)
        register_provider_from_config()

def register_provider_from_config():
        oauth.register(
        name=get_config_value(ConfigType.OAUTH_PROVIDER_NAME),
        server_metadata_url=get_config_value(ConfigType.OAUTH_DISCOVERY_DOCUMENT_URL),
        client_id=get_config_value(ConfigType.OAUTH_CLIENT_ID),
        client_secret=get_config_value(ConfigType.OAUTH_CLIENT_SECRET),
        client_kwargs={'scope': 'openid email profile'}
    )

def unregister_provider(provider_name):
     if provider_name in oauth._clients:
          oauth._clients[provider_name]
          oauth._registry[provider_name]

def toggle_oauth(value):
    if value:
        setup_oauth()
    else:
        unregister_provider(get_config_value(ConfigType.OAUTH_PROVIDER_NAME))