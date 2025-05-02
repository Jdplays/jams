from flask import Blueprint

from jams.routes.api_v1.private import private_bp
from jams.routes.api_v1.public import public_bp
from jams.routes.api_v1.integrations import integrations_bp
from jams.routes.api_v1.webhooks import bp as webhooks_bp

api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')

api_v1_bp.register_blueprint(private_bp)
api_v1_bp.register_blueprint(public_bp)
api_v1_bp.register_blueprint(integrations_bp)
api_v1_bp.register_blueprint(webhooks_bp)

@api_v1_bp.route('discord-test')
def discord_test():
    from flask_security import current_user
    from jams import DiscordBot
    from jams.models import db, DiscordBotMessage
    from jams.configuration import ConfigType, get_config_value
    from jams.util.enums import DiscordMessageType, DiscordMessageViews
    from uuid import uuid4
    from flask import request

    base_url = get_config_value(ConfigType.APP_URL)
    attendance_url = f'{base_url}/private/volunteer/attendance'

    account_id = request.args.get('id')
    if not account_id:
        account_id = current_user.config.discord_account_id
    
    message_db_id = uuid4()

    sent_message = DiscordBot.send_rsvp_reminder(account_id, attendance_url, message_db_id)

    if sent_message:
        persistent_message = DiscordBotMessage(
            id=message_db_id,
            message_id=sent_message.id,
            channel_id=sent_message.channel.id,
            message_type=DiscordMessageType.RSVP_REMINDER.name,
            user_id=current_user.id,
            account_id=account_id,
            view_type=DiscordMessageViews.RSVP_REMINDER_VIEW.name,
            view_data={'url': attendance_url}
        )

        db.session.add(persistent_message)
        db.session.commit()
        return 'Message Sent!'