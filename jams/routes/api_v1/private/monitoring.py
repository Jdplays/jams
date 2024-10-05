# API is for serving data to Typscript/Javascript
from flask import Blueprint, jsonify, request
from jams.decorators import role_based_access_control_be
from jams.models import db, PrivateAccessLog, TaskSchedulerLog, WebhookLog, ExternalAPILog
from jams.util import helper

bp = Blueprint('monitoring', __name__)

# Private Access Log
@bp.route('/private_access_logs', methods=['GET'])
@role_based_access_control_be
def get_private_access_logs():
    data = helper.filter_model_by_query_and_properties(PrivateAccessLog, request.args)
    data['metadata'] = {
        'table_size': PrivateAccessLog.size()
    }
    return jsonify(data)

@bp.route('/private_access_logs/metadata', methods=['GET'])
@role_based_access_control_be
def get_private_access_logs_metadata():
    data = {
        'table_size': PrivateAccessLog.size()
    }
    return jsonify(data)

# Task Shceduler Log
@bp.route('/task_scheduler_logs', methods=['GET'])
@role_based_access_control_be
def get_task_scheduler_logs():
    data = helper.filter_model_by_query_and_properties(TaskSchedulerLog, request.args)
    data['metadata'] = {
        'table_size': TaskSchedulerLog.size()
    }
    return jsonify(data)

@bp.route('/task_scheduler_logs/metadata', methods=['GET'])
@role_based_access_control_be
def get_task_scheduler_logs_metadata():
    data = {
        'table_size': TaskSchedulerLog.size()
    }
    return jsonify(data)

# Webhooks Log
@bp.route('/webhook_logs', methods=['GET'])
@role_based_access_control_be
def get_webhook_logs():
    data = helper.filter_model_by_query_and_properties(WebhookLog, request.args)
    data['metadata'] = {
        'table_size': WebhookLog.size()
    }
    return jsonify(data)

@bp.route('/webhook_logs/metadata', methods=['GET'])
@role_based_access_control_be
def get_webhook_logs_metadata():
    data  = {
        'table_size': WebhookLog.size()
    }
    return jsonify(data)


# External API Log
@bp.route('/external_api_logs', methods=['GET'])
@role_based_access_control_be
def get_external_api_logs():
    data = helper.filter_model_by_query_and_properties(ExternalAPILog, request.args)
    data['metadata'] = {
        'table_size': ExternalAPILog.size()
    }
    return jsonify(data)

@bp.route('/external_api_logs/metadata', methods=['GET'])
@role_based_access_control_be
def get_external_api_logs_metadata():
    data  = {
        'table_size': ExternalAPILog.size()
    }
    return jsonify(data)
