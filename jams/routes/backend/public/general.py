# Frontend is just for serving pages
from datetime import date
from flask import Blueprint, jsonify, request
from sqlalchemy import func
from jams.models import Event

bp = Blueprint('genral', __name__)

# URL PREFIX = /backend

@bp.route('/get_next_event', methods=['GET'])
def get_next_event():
    args = request.args
    
    inclusive = True
    inc_arg = args.get('inclusive')

    if inc_arg is not None:
        inc_arg = inc_arg.lower() in ['true', 't']
        inclusive = inc_arg

    event = None
    if inclusive:
        event = Event.query.filter(Event.date >= date.today()).order_by(Event.date.asc()).first()
    else:
        event = Event.query.filter(Event.date > date.today()).order_by(Event.date.asc()).first()
    
    if not event:
        return jsonify({
            'message': 'No Event found',
            'data': -1
        })
    
    return jsonify({
            'message': 'Event found that matches parameters',
            'data': event.id
        })
    