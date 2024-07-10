# Backend is just for serving data to javascript
from flask import Blueprint, jsonify
from flask_security import login_required, current_user

bp = Blueprint('backend', __name__, url_prefix='/backend')

# URL PREFIX = /backend

@bp.route('/get_current_user_id', methods=['GET'])
@login_required
def get_current_user_id():
    if current_user.is_authenticated:
        return jsonify({'current_user_id': current_user.id})