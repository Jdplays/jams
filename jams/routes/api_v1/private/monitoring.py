# API is for serving data to Typscript/Javascript
from flask import Blueprint, jsonify, request
from jams.decorators import role_based_access_control_be
from flask_security import login_required
from jams.models import db, PrivateAccessLog
from jams.util import helper

bp = Blueprint('monitoring', __name__)

@bp.route('/private_access_logs', methods=['GET'])
@role_based_access_control_be
def get_private_access_logs():
    data = helper.filter_model_by_query_and_properties(PrivateAccessLog, request.args)
    return jsonify(data)