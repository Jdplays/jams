# API is for serving data to Typscript/Javascript
from flask import Blueprint, abort, jsonify, request
from flask_security import login_required, current_user
from jams.decorators import api_route
from jams.configuration import get_config_value, set_config_value, ConfigType
from jams.util import helper

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
    data = {
        ConfigType.APP_VERSION.name: get_config_value(ConfigType.APP_VERSION),
        ConfigType.TIMEZONE.name: get_config_value(ConfigType.TIMEZONE),
        ConfigType.STREAKS_ENABLED.name: get_config_value(ConfigType.STREAKS_ENABLED)
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
    
    config = {
        ConfigType.TIMEZONE.name: get_config_value(ConfigType.TIMEZONE),
        ConfigType.STREAKS_ENABLED.name: get_config_value(ConfigType.STREAKS_ENABLED)
    } 

    return jsonify({'data': config})

@bp.route('/app/recalculate_streaks', methods=['POST'])
@api_route
def recalculate_streaks():
    if not get_config_value(ConfigType.STREAKS_ENABLED):
        return jsonify({'message': 'Streaks are not currently enabled'})
    
    helper.recalculate_streaks()

    return jsonify({'message': 'Streaks have been successfully recalculated'})