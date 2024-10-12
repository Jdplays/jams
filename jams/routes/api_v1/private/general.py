# API is for serving data to Typscript/Javascript
from flask import Blueprint, abort, jsonify, request
from flask_security import login_required, current_user
from jams.decorators import role_based_access_control_be
from jams.configuration import get_config_value, set_config_value, ConfigType

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
@role_based_access_control_be
def get_general_config():
    data = {
        ConfigType.TIMEZONE.name: get_config_value(ConfigType.TIMEZONE)
    }

    return jsonify({'config': data})

@bp.route('/app/config', methods=['PATCH'])
@role_based_access_control_be
def edit_general_config():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    timezone = data.get(ConfigType.TIMEZONE.name)

    if timezone:
        set_config_value(ConfigType.TIMEZONE, timezone)
    
    config = {
        ConfigType.TIMEZONE.name: get_config_value(ConfigType.TIMEZONE)
    } 

    return jsonify({'config': config})