# Backend is just for serving data to javascript
from flask import Blueprint, jsonify
from flask_security import login_required, current_user

bp = Blueprint('general', __name__)

# URL PREFIX = /backend

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
    