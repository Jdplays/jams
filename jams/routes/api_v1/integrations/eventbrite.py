# API is for serving data to Typscript/Javascript
from flask import Blueprint, request, jsonify, abort
from jams.decorators import role_based_access_control_be, eventbrite_inetegration_route
from jams.integrations import eventbrite
from jams.configuration import ConfigType, get_config_value, set_config_value, create_config_entry, remove_config_entry

bp = Blueprint('eventbrite', __name__, url_prefix='/eventbrite')

# URL PREFIX = /api/v1
@bp.route('/verify', methods=['POST'])
@role_based_access_control_be
def verify():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    custom_token = data.get(ConfigType.EVENTBRITE_BEARER_TOKEN.name)
    if custom_token == None:
        abort(400, description="Private token not provided")
    
    verified = eventbrite.verify(custom_token)

    return jsonify({'verified': verified})

@bp.route('/organisations', methods=['POST'])
@role_based_access_control_be
def get_organisations():
    data = request.get_json()
    custom_token = data.get(ConfigType.EVENTBRITE_BEARER_TOKEN.name)
    if custom_token:
        organisations = eventbrite.get_organisations(custom_token)
    else:
        organisations = eventbrite.get_organisations()

    return jsonify({'organisations': [org.to_dict() for org in organisations]})

@bp.route('/config', methods=['GET'])
@role_based_access_control_be
def get_config():
    eventbrite_config = {}

    enabled = get_config_value(ConfigType.EVENTBRITE_ENABLED)
    if enabled == None:
        enabled = False

    eventbrite_config[ConfigType.EVENTBRITE_ENABLED.name] = enabled if enabled != None else False
    eventbrite_config[ConfigType.EVENTBRITE_ORGANISATION_ID.name] = get_config_value(ConfigType.EVENTBRITE_ORGANISATION_ID)
    eventbrite_config[ConfigType.EVENTBRITE_ORGANISATION_NAME.name] = get_config_value(ConfigType.EVENTBRITE_ORGANISATION_NAME)

    return jsonify({'eventbrite_config': eventbrite_config})

@bp.route('/config', methods=['PATCH'])
@role_based_access_control_be
def edit_config():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    allowed_fields = list(config_item.name for config_item in eventbrite.configItems)
    for config_name, value in data.items():
        if config_name in allowed_fields:
            set_config_value(ConfigType[config_name], value)

    eventbrite_config = {}

    enabled = get_config_value(ConfigType.EVENTBRITE_ENABLED)
    if enabled == None:
        enabled = False


    eventbrite_config[ConfigType.EVENTBRITE_ENABLED.value] = enabled if enabled != None else False
    eventbrite_config[ConfigType.EVENTBRITE_BEARER_TOKEN.value] = get_config_value(ConfigType.EVENTBRITE_BEARER_TOKEN)
    eventbrite_config[ConfigType.EVENTBRITE_ORGANISATION_ID.value] = get_config_value(ConfigType.EVENTBRITE_ORGANISATION_ID)
    eventbrite_config[ConfigType.EVENTBRITE_ORGANISATION_NAME.value] = get_config_value(ConfigType.EVENTBRITE_ORGANISATION_NAME)

    return jsonify({'eventbrite_config': eventbrite_config})

@bp.route('/enable', methods=['POST'])
@role_based_access_control_be
def enable():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    allowed_fields = list(config_item.name for config_item in eventbrite.configItems)
    for config_name, value in data.items():
        if config_name in allowed_fields:
            if not value:
                value = ''
            create_config_entry(ConfigType[config_name], value)

    return jsonify({'message': 'Eventbrite Integration has been successfully enabled'})

@bp.route('/disable', methods=['DELETE'])
@role_based_access_control_be
@eventbrite_inetegration_route
def disable():
    remove_config_entry(ConfigType.EVENTBRITE_ENABLED)
    remove_config_entry(ConfigType.EVENTBRITE_BEARER_TOKEN)
    remove_config_entry(ConfigType.EVENTBRITE_ORGANISATION_ID)
    remove_config_entry(ConfigType.EVENTBRITE_ORGANISATION_NAME)
    return jsonify({'message': 'Eventbrite Integration has been successfully enabled'})


@bp.route('/events', methods=['GET'])
@role_based_access_control_be
@eventbrite_inetegration_route
def get_events():
    events = eventbrite.get_events()

    return jsonify({'events': [event.to_dict() for event in events]})
