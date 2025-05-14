# API is for serving data to TypeScript/Javascript
from flask import Blueprint, jsonify, request

from common.util import stats
from common.models import PrivateAccessLog, TaskSchedulerLog, WebhookLog, ExternalAPILog, Event

from web.util import helper
from web.util.sse import sse_stream
from web.util.decorators import api_route

bp = Blueprint('monitoring', __name__)

#------------------------------------------ LOGS ------------------------------------------#

# Private Access Log
@bp.route('/private_access_logs', methods=['GET'])
@api_route
def get_private_access_logs():
    data = helper.filter_model_by_query_and_properties(PrivateAccessLog, request.args)
    data['metadata'] = {
        'table_size': PrivateAccessLog.size()
    }
    return jsonify(data)

@bp.route('/private_access_logs/metadata', methods=['GET'])
@api_route
def get_private_access_logs_metadata():
    data = {
        'table_size': PrivateAccessLog.size()
    }
    return jsonify(data)

# Task Shceduler Log
@bp.route('/task_scheduler_logs', methods=['GET'])
@api_route
def get_task_scheduler_logs():
    data = helper.filter_model_by_query_and_properties(TaskSchedulerLog, request.args)
    data['metadata'] = {
        'table_size': TaskSchedulerLog.size()
    }
    return jsonify(data)

@bp.route('/task_scheduler_logs/metadata', methods=['GET'])
@api_route
def get_task_scheduler_logs_metadata():
    data = {
        'table_size': TaskSchedulerLog.size()
    }
    return jsonify(data)

# Webhooks Log
@bp.route('/webhook_logs', methods=['GET'])
@api_route
def get_webhook_logs():
    data = helper.filter_model_by_query_and_properties(WebhookLog, request.args)
    data['metadata'] = {
        'table_size': WebhookLog.size()
    }
    return jsonify(data)

@bp.route('/webhook_logs/metadata', methods=['GET'])
@api_route
def get_webhook_logs_metadata():
    data  = {
        'table_size': WebhookLog.size()
    }
    return jsonify(data)


# External API Log
@bp.route('/external_api_logs', methods=['GET'])
@api_route
def get_external_api_logs():
    data = helper.filter_model_by_query_and_properties(ExternalAPILog, request.args)
    data['metadata'] = {
        'table_size': ExternalAPILog.size()
    }
    return jsonify(data)

@bp.route('/external_api_logs/metadata', methods=['GET'])
@api_route
def get_external_api_logs_metadata():
    data  = {
        'table_size': ExternalAPILog.size()
    }
    return jsonify(data)

#------------------------------------------ Stats ------------------------------------------#

@bp.route('/stats/live/stream')
@api_route
def get_live_stats_sse():
    def fetch_data():
        mode, event_id = stats.get_event_stats_mode()
        return stats.get_live_event_stats(event_id, mode=mode)
    return sse_stream(fetch_data)

@bp.route('/stats/events/<int:event_id>', methods=['GET'])
@api_route
def get_event_stats(event_id):
    event_stats = stats.get_post_event_stats(event_id)

    return jsonify({'data': event_stats})


@bp.route('/stats/recalculate', methods=['POST'])
@api_route
def recalculate_stats():
    events = Event.query.all()

    try:
        for event in events:
            stats.generate_event_stats(event.id, True)
    except Exception as e:
        print(e)
        return jsonify({'message': 'An unknown error occured when recalculating all event stats.'}), 400
    

    return jsonify({'message': 'All event stats have been successfully recalculated.'}), 200

