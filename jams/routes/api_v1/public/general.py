# Frontend is just for serving pages
from flask import Blueprint, jsonify, request
from jams.util import helper

bp = Blueprint('genral', __name__)

# URL PREFIX = /api/v1

@bp.route('/get_next_event', methods=['GET'])
def get_next_event():
    args = request.args
    
    inclusive = True
    inc_arg = args.get('inclusive')

    if inc_arg is not None:
        inc_arg = inc_arg.lower() in ['true', 't']
        inclusive = inc_arg

    event = helper.get_next_event(inclusive)
    
    if not event:
        return jsonify({'message': 'No Event found'}), 404
    
    return jsonify({
            'message': 'Event found that matches parameters',
            'data': event.id
        })
    