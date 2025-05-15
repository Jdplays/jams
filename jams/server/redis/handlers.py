from common.models import db, Webhook

from server.util.webhooks import execute_webhook
from server.redis import utils as redis_utils

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

def handle_discord_bot_control(payload:dict):
    from server import DiscordBot

    action = payload.get('action')
    config = payload.get('config')

    if not action and not config:
        raise Exception('[DiscordBot Control Handler] No action or config provided')
    
    if config is not None:
        guild_id = config.get('guild_id', DiscordBot._guild_id)
        DiscordBot._guild_id = guild_id
        redis_utils.set_discord_bot_config(DiscordBot)
    
    if action == 'start':
        DiscordBot.start()
    elif action == 'stop':
        DiscordBot.stop()
