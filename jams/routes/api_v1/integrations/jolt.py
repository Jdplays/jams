# API is for serving data to Typscript/Javascript
from flask import Blueprint, jsonify
from jams.integrations import jolt
from jams.util import helper

bp = Blueprint('jolt', __name__, url_prefix='/jolt')

@bp.route('/status', methods=['GET'])
def get_jolt_status():
    last_healthcheck, online = jolt.last_healthcheck()

    return_dict = {
        'online': online,
    }

    if last_healthcheck:
        return_dict['date_time'] = helper.convert_datetime_to_local_timezone(last_healthcheck.date_time)
        if last_healthcheck.error:
            return_dict['error'] = last_healthcheck.error
    
    return jsonify(return_dict)

@bp.route('/test_print', methods=['POST'])
def jolt_test_print():
    success, message = jolt.add_test_to_print_queue()

    if success:
        return jsonify({'message': message}), 200
    else:
        return jsonify({'message': message}), 400