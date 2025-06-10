from common.models import db, Webhook, User
from common.util.enums import DiscordRecipientType, DiscordMessageType, DiscordMessageView

from server.util.webhooks import execute_webhook
from server.redis import utils as redis_utils
from server.discord.utils import _get_discord_bot, sync_discord_nicknames

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
    bot = _get_discord_bot()

    action = payload.get('action')
    config = payload.get('config')

    if not action and not config:
        raise Exception('[DiscordBot Control Handler] No action or config provided')
    
    if config is not None:
        guild_id = config.get('guild_id', bot._guild_id)
        bot._guild_id = guild_id
        redis_utils.set_discord_bot_config(bot)
    
    if action == 'start':
        bot.start()
    elif action == 'stop':
        bot.stop()

def handle_discord_action(payload:dict):
    action = payload.get('action')
    data = payload.get('data')

    if not action:
        raise Exception('[DiscordBot Action Handler] No action provided')
    
    match action:
        case 'username_sync':
            sync_discord_nicknames(**data if data else {})

def handle_discord_send_message(payload:dict):
    bot = _get_discord_bot()
    recipient_type = DiscordRecipientType(payload.get('recipient_type'))
    data:dict = payload.get('data')

    message = data.get('message')
    message_type = DiscordMessageType(data.get('message_type'))

    view_type = DiscordMessageView(data.get('message_view')) or None
    view_data = data.get('view_data', None)
    event_id = data.get('event_id', None)

    if recipient_type == DiscordRecipientType.DM:
        user_id = data.get('user_id')
        user = User.query.filter_by(id=user_id).first()
        if not user:
            raise Exception(f'[DiscordBot Send Message Handler] User {user_id} does not exist.')
        
        if user.config:
            discord_user_id = user.config.discord_account_id
        
        if not user.config or discord_user_id is None:
            raise Exception(f'[DiscordBot Send Message Handler] User {user_id} does not have a linked discord account.')
        
        
        bot.send_dm_to_user(
            user_id=user_id,
            discord_user_id=discord_user_id,
            message=message,
            message_type=message_type.name,
            view_type=view_type.name,
            view_data=view_data,
            event_id=event_id
        )
    elif recipient_type == DiscordRecipientType.CHANNEL:
        channel_id = data.get('channel_id')

        bot.send_message_to_channel(
            channel_id=channel_id,
            message=message,
            message_type=message_type.name,
            view_type=view_type.name,
            view_data=view_data,
            event_id=event_id
        )

def handle_discord_update_message(payload:dict):
    bot = _get_discord_bot()

    message_db_id = payload.get('message_db_id')
    expired = payload.get('expired')
    active = payload.get('active')
    new_content = payload.get('new_content', None)
    new_view_type = payload.get('new_view_type', None)
    new_message_type = payload.get('new_message_type', None)

    bot.update_message(
        message_db_id=message_db_id,
        expired=expired,
        new_content=new_content,
        new_view_type=new_view_type,
        new_message_type=new_message_type,
        active=active
    )

