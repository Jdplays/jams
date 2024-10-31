# API is for serving data to Typscript/Javascript
from flask import Blueprint, request, jsonify, abort
from jams.decorators import api_route, eventbrite_inetegration_route
from jams.integrations import oauth
from jams.configuration import ConfigType, get_config_value, set_config_value, create_config_entry, remove_config_entry

bp = Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/config', methods=['GET'])
@api_route
def get_config():
    auth_config = {}

    auth_config[ConfigType.LOCAL_AUTH_ENABLED.name] = get_config_value(ConfigType.LOCAL_AUTH_ENABLED)
    auth_config[ConfigType.OAUTH_ENABLED.name] = get_config_value(ConfigType.OAUTH_ENABLED)
    auth_config[ConfigType.OAUTH_PROVIDER_NAME.name] = get_config_value(ConfigType.OAUTH_PROVIDER_NAME)
    auth_config[ConfigType.OAUTH_DISCOVERY_DOCUMENT_URL.name] = get_config_value(ConfigType.OAUTH_DISCOVERY_DOCUMENT_URL)
    auth_config[ConfigType.OAUTH_CLIENT_ID.name] = get_config_value(ConfigType.OAUTH_CLIENT_ID)

    return jsonify({'auth_config': auth_config})

@bp.route('/config', methods=['PATCH'])
@api_route
def edit_config():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    allowed_fields = list(config_item.name for config_item in oauth.configItems)
    for config_name, value in data.items():
        if config_name in allowed_fields:
            if config_name == ConfigType.OAUTH_ENABLED.name:
                if not value and not get_config_value(ConfigType.LOCAL_AUTH_ENABLED):
                    return jsonify({'message': 'Unable to disable remaining auth source'}), 400
            if config_name == ConfigType.LOCAL_AUTH_ENABLED.name:
                if not value and not get_config_value(ConfigType.OAUTH_ENABLED):
                    return jsonify({'message': 'Unable to disable remaining auth source'}), 400
            set_config_value(ConfigType[config_name], value)
            # Toggle the oauth client if it is enabled/disabled
            if config_name == ConfigType.OAUTH_ENABLED.name:
                oauth.toggle_oauth(value)
    return jsonify({'message': 'OAuth configuration has been successfully updated'})

@bp.route('/config', methods=['DELETE'])
@api_route
@eventbrite_inetegration_route
def delete_config():
    remove_config_entry(ConfigType.OAUTH_ENABLED)
    remove_config_entry(ConfigType.OAUTH_PROVIDER_NAME)
    remove_config_entry(ConfigType.OAUTH_DISCOVERY_DOCUMENT_URL)
    remove_config_entry(ConfigType.OAUTH_CLIENT_ID)
    remove_config_entry(ConfigType.OAUTH_CLIENT_SECRET)
    return jsonify({'message': 'OAuth configuration has been successfully removed'})