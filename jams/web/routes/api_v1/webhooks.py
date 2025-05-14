# Webhooks allow external applications to "poke" JAMS if there is a change in something on their end. They are used to trigger events on JAMS
from flask import Blueprint, request, abort

from common.models import Webhook

from web.redis.utils import trigger_webhook

bp = Blueprint('webhooks', __name__, url_prefix='/webhooks')

@bp.route('/<uuid:id>', methods=['POST'])
def get_config(id):
    webhook:Webhook = Webhook.query.filter_by(id=id).first_or_404()

    if not webhook.active:
        return "Webhook Archived", 410

    data = request.get_json()
    if webhook.authenticated:
        # Check auth token in the future
        print('This is an Authenticated webhook')
    
    
    if webhook.external_id:
        if webhook.external_id != data.get('config').get('webhook_id'):
            webhook.log(message='external ID does not match records', success=False)
            abort(400, description='Webhook external ID does not match records')
    if not webhook.action_enum:
        webhook.log(message='has no action assigned', success=False)
        abort(400, description='Webhook has no action assigned')
    
    trigger_webhook(webhook.id, data)
    return 'Webhook executed', 200