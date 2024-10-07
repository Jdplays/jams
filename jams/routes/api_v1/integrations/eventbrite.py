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

    eventbrite_config = eventbrite.eventbrite_config_dict()

    return jsonify({'eventbrite_config': eventbrite_config})

@bp.route('/config', methods=['PATCH'])
@role_based_access_control_be
def edit_config():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    new_org = False
    allowed_fields = list(config_item.name for config_item in eventbrite.configItems)
    for config_name, value in data.items():
        if config_name in allowed_fields:
            if value == '' or value == None:
                remove_config_entry(ConfigType[config_name])
            if config_name == ConfigType.EVENTBRITE_ORGANISATION_ID.name:
                if value != get_config_value(ConfigType.EVENTBRITE_ORGANISATION_ID):
                    new_org = True
            set_config_value(ConfigType[config_name], value)

    if new_org:
        remove_config_entry(ConfigType.EVENTBRITE_CONFIG_EVENT_ID)
        eventbrite.create_eventbrite_webhooks()

    eventbrite_config = {}

    enabled = get_config_value(ConfigType.EVENTBRITE_ENABLED)
    if enabled == None:
        enabled = False


    eventbrite_config = eventbrite.eventbrite_config_dict()

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
    
    eventbrite.create_eventbrite_webhooks()

    return jsonify({'message': 'Eventbrite Integration has been successfully enabled'})

@bp.route('/disable', methods=['DELETE'])
@role_based_access_control_be
@eventbrite_inetegration_route
def disable():
    for config in eventbrite.configItems:
        remove_config_entry(config)
    eventbrite.deactivate_eventbrite_webhooks()
    return jsonify({'message': 'Eventbrite Integration has been successfully enabled'})


@bp.route('/events', methods=['GET'])
@role_based_access_control_be
@eventbrite_inetegration_route
def get_events():
    events = eventbrite.get_events()

    return jsonify({'events': [event.to_dict() for event in events]})


@bp.route('/ticket_types', methods=['GET'])
@role_based_access_control_be
def get_ticket_types():
    ticket_types = eventbrite.get_ticket_types()

    return jsonify({'ticket_types': [tt.to_dict() for tt in ticket_types]})

@bp.route('/custom_questions', methods=['GET'])
@role_based_access_control_be
def get_custom_questions():
    questions = eventbrite.get_custom_questions()

    return jsonify({'questions': [q for q in questions]})
