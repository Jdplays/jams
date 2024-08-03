# Backend is just for serving data to javascript
from flask import Blueprint, jsonify
from jams.decorators import role_based_access_control_be
from flask_security import login_required
from jams.models import db, PrivateAccessLog

bp = Blueprint('monitoring', __name__)

@bp.route('/private_access_logs', methods=['GET'])
@login_required
@role_based_access_control_be
def get_private_access_logs():
    private_access_logs = PrivateAccessLog.query.all()
    private_access_logs_data_list = [log.to_dict() for log in private_access_logs]
    return jsonify({'private_access_logs': private_access_logs_data_list})