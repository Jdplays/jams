# API is for serving data to Typscript/Javascript
from flask import Blueprint, abort, jsonify
from jams.decorators import api_route
from jams.integrations import jolt
from jams.util import helper
from jams.configuration import ConfigType, set_config_value, remove_config_entry

bp = Blueprint('jolt', __name__, url_prefix='/jolt')

@bp.route('/status', methods=['GET'])
@api_route
def get_status():
    last_healthcheck, online = jolt.last_healthcheck()

    return_dict = {
        'online': online,
    }

    if last_healthcheck:
        return_dict['date_time'] = helper.convert_datetime_to_local_timezone(last_healthcheck.date_time)
        if last_healthcheck.error:
            return_dict['error'] = last_healthcheck.error
    
    return jsonify(return_dict)

@bp.route('/enable', methods=['POST'])
@api_route
def enable():
    api_key_id, token = jolt.generate_api_token()

    if (not api_key_id or not token):
        abort(400)

    set_config_value(ConfigType.JOLT_ENABLED, True)
    set_config_value(ConfigType.JOLT_API_KEY_ID, api_key_id)

    jolt_config = jolt.config_dict()
    jolt_config['TOKEN'] = token
    
    return jsonify({'jolt_config': jolt_config})

@bp.route('/disable', methods=['POST'])
@api_route
def disable():
    jolt.disable_old_api_tokens()

    set_config_value(ConfigType.JOLT_ENABLED, False)
    remove_config_entry(ConfigType.JOLT_API_KEY_ID)

    jolt_config = jolt.config_dict()
    
    return jsonify({'jolt_config': jolt_config})

@bp.route('/refresh_api_token', methods=['POST'])
@api_route
def refresh_api_token():
    api_key_id, token = jolt.generate_api_token()

    if (not api_key_id or not token):
        abort(400)

    set_config_value(ConfigType.JOLT_ENABLED, True)
    set_config_value(ConfigType.JOLT_API_KEY_ID, api_key_id)

    jolt_config = jolt.config_dict()
    jolt_config['TOKEN'] = token
    
    return jsonify({'jolt_config': jolt_config})

@bp.route('/test_print', methods=['POST'])
@api_route
def test_print():
    success, message = jolt.add_test_to_print_queue()

    if success:
        return jsonify({'message': message}), 200
    else:
        return jsonify({'message': message}), 400
    
@bp.route('/config', methods=['GET'])
@api_route
def get_config():
    jolt_config = jolt.config_dict()

    return jsonify({'jolt_config': jolt_config})