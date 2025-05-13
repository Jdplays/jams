from common.models import db, Webhook

from server.util.webhooks import execute_webhook

def handle_webhook_trigger(payload:dict):
    webhook_id = payload.get('webhook_id')
    request_body = payload.get('data')


    if not webhook_id or not request_body:
        raise Exception('[Webhook Handler] No webhook ID or data provided')

    webhook = Webhook.query.filter_by(id=webhook_id).first()
    if not webhook:
        raise Exception(f'[Webhook Handler] Webhook ID {webhook_id} not found')
    
    try:
        execute_webhook(webhook, request_body)
    except Exception as e:
        webhook.log(message=str(e), success=False)
        db.session.commit()
        raise Exception(f'[Webhook Handler] Error executing webhook: {e}')