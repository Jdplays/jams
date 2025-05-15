# API is for serving data to TypeScript/JavaScript
from datetime import UTC, datetime, timedelta
from flask import Blueprint, abort, jsonify
from sqlalchemy import and_, or_


from common.util import helper
from common.configuration import ConfigType, set_config_value, remove_config_entry
from common.util.enums import JOLTPrintQueueStatus
from common.integrations import jolt

from web.util.decorators import api_route

bp = Blueprint('jolt', __name__, url_prefix='/jolt')

@bp.route('/status', methods=['GET'])
@api_route
def get_status():
    from common.models import JOLTPrintQueue
    last_healthcheck, online = jolt.last_healthcheck()

    return_dict = {
        'online': online,
    }

    if last_healthcheck:
        return_dict['date_time'] = helper.convert_datetime_to_local_timezone(last_healthcheck.date_time)
        return_dict['local_ip'] = last_healthcheck.local_ip
    
    now = datetime.now(UTC).replace(tzinfo=None)
    target_datetime = now - timedelta(minutes=15)
    
    last_complte_job = JOLTPrintQueue.query.filter(
        and_(
            JOLTPrintQueue.date_time >= target_datetime,
            or_(
                JOLTPrintQueue.status == JOLTPrintQueueStatus.FAILED.name,
                JOLTPrintQueue.status == JOLTPrintQueueStatus.PRINTED.name
            )
        )
    ).order_by(JOLTPrintQueue.date_time.desc()).first()

    if last_complte_job:
        if last_complte_job.status == JOLTPrintQueueStatus.FAILED.name and last_complte_job.error:
            return_dict['error'] = last_complte_job.error
    
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