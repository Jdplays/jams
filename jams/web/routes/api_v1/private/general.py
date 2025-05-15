# API is for serving data to TypeScript/JavaScript
from flask import Blueprint, abort, jsonify, request
from flask_security import login_required, current_user

from common.configuration import get_config_value, set_config_value, ConfigType
from common.util import helper
from common.redis import utils

from web.util.decorators import api_route

bp = Blueprint('general', __name__)

# URL PREFIX = /api/v1

@bp.route('/get_current_user_id', methods=['GET'])
@login_required
def get_current_user_id():
    if current_user.is_authenticated:
        return jsonify({'current_user_id': current_user.id})
    
@bp.route('/get_current_user_data', methods=['GET'])
@login_required
def get_current_user_data():
    if current_user.is_authenticated:
        return jsonify(current_user.to_dict())
    

@bp.route('/app/config', methods=['GET'])
@api_route
def get_general_config():
    web_version = utils.get_app_version('web')
    server_version = utils.get_app_version('server')
    data = {
        'WEB_VERSION': web_version,
        'SERVER_VERSION': server_version,
        ConfigType.TIMEZONE.name: get_config_value(ConfigType.TIMEZONE),
        ConfigType.STREAKS_ENABLED.name: get_config_value(ConfigType.STREAKS_ENABLED),
        ConfigType.EVENT_PREFIX_FILTER.name: get_config_value(ConfigType.EVENT_PREFIX_FILTER)
    }

    return jsonify({'data': data})

@bp.route('/app/latest_release', methods=['GET'])
@api_route
def get_latest_release():
    data = helper.get_latest_release()

    return jsonify({'data': data})

@bp.route('/app/config', methods=['PATCH'])
@api_route
def edit_general_config():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    timezone = data.get(ConfigType.TIMEZONE.name)
    if timezone:
        set_config_value(ConfigType.TIMEZONE, timezone)
    
    streaks_enabled = data.get(ConfigType.STREAKS_ENABLED.name)
    if streaks_enabled is not None:
        set_config_value(ConfigType.STREAKS_ENABLED, streaks_enabled)

    event_prefix_filter = data.get(ConfigType.EVENT_PREFIX_FILTER.name)
    set_config_value(ConfigType.EVENT_PREFIX_FILTER, event_prefix_filter)
    
    config = {
        ConfigType.TIMEZONE.name: get_config_value(ConfigType.TIMEZONE),
        ConfigType.STREAKS_ENABLED.name: get_config_value(ConfigType.STREAKS_ENABLED),
        ConfigType.EVENT_PREFIX_FILTER.name: get_config_value(ConfigType.EVENT_PREFIX_FILTER)
    } 

    return jsonify({'data': config})

@bp.route('/app/recalculate_streaks', methods=['POST'])
@api_route
def recalculate_streaks():
    if not get_config_value(ConfigType.STREAKS_ENABLED):
        return jsonify({'message': 'Streaks are not currently enabled'})
    
    helper.recalculate_streaks()

    return jsonify({'message': 'Streaks have been successfully recalculated'})