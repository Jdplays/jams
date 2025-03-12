# API is for serving data to Typscript/Javascript
import json
import sys
from time import sleep
from flask import Blueprint, Response, jsonify, request, stream_with_context
from datetime import datetime, UTC, timedelta
from jams.decorators import api_route
from jams.models import db, PrivateAccessLog, TaskSchedulerLog, WebhookLog, ExternalAPILog
from jams.util import helper, stats

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
    def event_stream():
        last_sent_data = None
        while True:
            mode, event_id = stats.get_event_stats_mode()
            
            current_data = stats.get_live_event_stats(event_id, mode=mode)
            if last_sent_data is None or current_data != last_sent_data:
                last_sent_data = current_data
                yield f'data: {json.dumps(current_data)}\n\n'
                sys.stdout.flush()
            sleep(1)
    return Response(stream_with_context(event_stream()), content_type='text/event-stream')

@bp.route('/stats/events/<int:event_id>', methods=['GET'])
@api_route
def get_event_stats(event_id):
    event_stats = stats.get_post_event_stats(event_id)

    return jsonify({'data': event_stats})


@bp.route('/stats/test/<int:event_id>')
def test(event_id):
    return jsonify({'data': stats.calculate_workshop_overlap(event_id)})

