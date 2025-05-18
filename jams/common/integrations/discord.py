

import requests
import time

from common.configuration import ConfigType, get_config_value, set_config_value
from common.extensions import get_logger
from common.models import db, ExternalAPILog, DiscordBotMessage
from common.redis import utils as redis_utils
from common.util import helper
from common.util.enums import DiscordMessageType, DiscordMessageView

logger = get_logger('DiscordIntegration')
base_url = 'https://discord.com/api/v10'

configItems = [
    ConfigType.DISCORD_BOT_ENABLED,
    ConfigType.DISCORD_BOT_TOKEN,
    ConfigType.DISCORD_CLIENT_ID,
    ConfigType.DISCORD_CLIENT_SECRET,
    ConfigType.DISCORD_BOT_GUILD_ID,
    ConfigType.DISCORD_BOT_ANNOUNCEMENT_CHANNEL_ID,
    ConfigType.DISCORD_BOT_DM_ENABLED,
    ConfigType.DISCORD_BOT_NAME_SYNC_ENABLED
]

def discord_config_dict():
    dict = {}
    for item in configItems:
        if item == ConfigType.DISCORD_BOT_TOKEN or item == ConfigType.DISCORD_CLIENT_SECRET:
            continue
        dict[item.name] = get_config_value(item)
    
    if dict[ConfigType.DISCORD_BOT_GUILD_ID.name]:
        channels_dict = get_channels_in_server()
        dict['DISCORD_BOT_CHANNELS'] = channels_dict
     
    return dict

def get_discord_integration_redirect_uri():
    return f'{get_config_value(ConfigType.APP_URL)}/discord/authorise'

def verify_bot_token(token):
    if not token:
        return False
    
    headers = {
        "Authorization": f"Bot {token}"
    }

    verified = False

    try:
        r = requests.get(f'{base_url}/users/@me', headers=headers)
        if r.status_code == 200:
            set_config_value(ConfigType.DISCORD_BOT_TOKEN, token)
            verified = True
    except Exception as e:
        logger.error(f'Error verifying Discord token {e}')
    finally:
        log = ExternalAPILog(url=f'{base_url}/users/@me', status_code=r.status_code)
        db.session.add(log)
        db.session.commit()

        return verified
    
def verify_client_secret(secret):
    if not secret:
        return False
    
    verified = False
    DISCORD_CLIENT_ID = get_config_value(ConfigType.DISCORD_CLIENT_ID)
    
    token_url = 'https://discord.com/api/oauth2/token'
    data = {
        'grant_type': 'client_credentials',
        'scope': 'identify'
    }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }


    auth=(DISCORD_CLIENT_ID, secret)

    try:
        r = requests.post(token_url,data=data, headers=headers, auth=auth)
        if r.status_code == 200:
            set_config_value(ConfigType.DISCORD_CLIENT_SECRET, secret)
            verified = True
        else:
            raise Exception(r.text)
    except Exception as e:
        logger.error(f'Error verifying Discord client secret {e}')
    finally:
        log = ExternalAPILog(url='https://discord.com/api/oauth2/token', status_code=r.status_code)
        db.session.add(log)
        db.session.commit()

        return verified

def exchange_code_for_oauth_token(auth_code):
    DISCORD_CLIENT_ID = get_config_value(ConfigType.DISCORD_CLIENT_ID)
    DISCORD_CLIENT_SECRET = get_config_value(ConfigType.DISCORD_CLIENT_SECRET)
    redirect_uri = get_discord_integration_redirect_uri()

    token_response = requests.post(
        'https://discord.com/api/oauth2/token',
        data={
            'grant_type': 'authorization_code',
            'code': auth_code,
            'redirect_uri': redirect_uri
        },
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        auth=(DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET)
    )

    return token_response

def get_discord_user_info(access_token):
    user_response = requests.get(
        'https://discord.com/api/users/@me',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    return user_response

# Start the discord server
def start_server():
    redis_utils.discord_bot_control(True)

    timeout = 10
    start_time = time.time()

    while time.time() - start_time < timeout:
        status = redis_utils.get_discord_bot_status()
        if status:
            if status.get('ready') is True:
                break
        time.sleep(0.5)
    else:
        logger.error('Bot did not become ready within 10 seconds.')

def stop_server():
    redis_utils.discord_bot_control(False)

def is_bot_ready():
    return redis_utils.get_discord_bot_status().get('ready')

def get_bot_client_id():
    return redis_utils.get_discord_bot_config().get('client_id')

def get_bot_guild_list():
    return redis_utils.get_discord_bot_config().get('guild_list')

def verify_guild_id(guild_id):
    guild_list = redis_utils.get_discord_bot_config().get('guild_list')
    current_guild_ids = {item['id'] for item in guild_list}
    return guild_id in current_guild_ids

def verify_channel_id(channel_id):
    channels = get_channels_in_server()
    existing_ids = [str(item['id']) for item in channels]
    return str(channel_id) in existing_ids

def get_guild_name(guild_id):
    guild_list = redis_utils.get_discord_bot_config().get('guild_list')
    for g in guild_list:
        if g['id'] == str(guild_id):
            return g['name']
    return None

def get_channels_in_server():
    return redis_utils.get_discord_bot_config().get('guild_channel_list')

def get_persistent_message(message_db_id):
    message = DiscordBotMessage.query.filter_by(id=message_db_id).first()
    return message

def get_params_for_message(message_db_id):
    message = get_persistent_message(message_db_id)
    if not message:
        return None
    
    return message.view_data

def set_bot_guild_id(guild_id):
    redis_utils.discord_bot_control(config={'guild_id': guild_id})

def sync_user_nicknames(user_id=None):
    data = None
    if user_id is not None:
        data = {'user_id': user_id}
    
    redis_utils.discord_bot_action('username_sync', data)

def send_or_update_latest_rsvp_reminder_to_confirm(volunteer_attendance):
    attending_setup = volunteer_attendance.setup
    attending_main = volunteer_attendance.main
    attending_packdown = volunteer_attendance.packdown

    if not attending_setup and not attending_main and not attending_packdown:
        # No to all
        new_message = '😞 No problem! Thanks for letting us know.'
    elif all([attending_setup, attending_main, attending_packdown]):
        # Yes to all
        new_message = '🥳 That\'s great news, Thank you!'
    elif attending_setup and not attending_main and not attending_packdown:
        # Just Setup
        new_message = '🧰 Really appreciate the support before the Jam!'
    elif attending_packdown and not attending_main and not attending_setup:
        # Just Packdown
        new_message = '🧹 Really appreciate the support after the Jam!'
    elif (attending_setup and attending_packdown) and not attending_main:
        # Setup and Packdown
        new_message = '🛠️ Really appreciate the support before and after the Jam!'
    elif (attending_setup and attending_main) and not attending_packdown:
        # Setup and Main
        new_message = '😃 Great, we\'ll try to not stretch setup out too long.'
    elif (attending_packdown and attending_main) and not attending_setup:
        # Packdown and Main
        new_message = '😃 Perfect, thanks for the support during and after the Jam!'
    elif attending_main and not attending_setup and not attending_packdown:
        # Just the main event
        new_message = '🎯 Great, we\'ll see you there!'
    else:
        # More of a fallback
        new_message = '✅ Thanks for filling in the form!'

    full_message = f"**{new_message}**\nIf plans change, you can update your response any time on JAMS."

    latest_reminder = DiscordBotMessage.query.filter(
        DiscordBotMessage.user_id == volunteer_attendance.user_id,
        DiscordBotMessage.event_id == volunteer_attendance.event_id,
        DiscordBotMessage.message_type == DiscordMessageType.RSVP_REMINDER.name,
        DiscordBotMessage.active == True
    ).order_by(
        DiscordBotMessage.timestamp.desc()
    ).first()

    if latest_reminder:
        redis_utils.discord_bot_update_message(
            message_db_id=latest_reminder.id,
            new_content=full_message,
            new_view_type=DiscordMessageView.RSVP_COMPLETE_VIEW,
            new_message_type=DiscordMessageType.RSVP_COMPLETE,
            active=False
        )
    else:
        attendance_url = helper.get_volunteer_attendance_url(volunteer_attendance.event_id)
        redis_utils.discord_bot_send_message(
            message=full_message,
            message_type=DiscordMessageType.RSVP_COMPLETE,
            user_id=volunteer_attendance.user_id,
            view_type=DiscordMessageView.RSVP_COMPLETE_VIEW,
            view_data={'url': attendance_url},
            event_id=volunteer_attendance.event_id,
            active=False
        )