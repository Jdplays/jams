

import base64
import requests
from jams.configuration import ConfigType, get_config_value, set_config_value
from jams import logger
from jams.models import db, ExternalAPILog, DiscordBotMessage
from asyncio import run_coroutine_threadsafe

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
        channels_dict = get_channels_in_server(dict[ConfigType.DISCORD_BOT_GUILD_ID.name])
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
    from jams import DiscordBot
    DiscordBot.start()
    DiscordBot.wait_until_ready(timeout=10)

def stop_server():
    from jams import DiscordBot
    DiscordBot.stop()

def get_bot_client_id():
    from jams import DiscordBot
    if not DiscordBot._client.user:
        return None
    return DiscordBot._client.user.id

def get_bot_guild_list():
    from jams import DiscordBot
    return DiscordBot._guild_list

def verify_guild_id(guild_id):
    from jams import DiscordBot
    current_guild_ids = {item['id'] for item in DiscordBot._guild_list}
    return guild_id in current_guild_ids

def verify_channel_id(channel_id):
    channels = get_channels_in_server(get_config_value(ConfigType.DISCORD_BOT_GUILD_ID))
    existing_ids = [str(item['id']) for item in channels]
    return str(channel_id) in existing_ids

def get_guild_name(guild_id):
    from jams import DiscordBot
    for g in DiscordBot._guild_list:
        if g['id'] == str(guild_id):
            return g['name']
    return None

def get_channels_in_server(guild_id):
    from jams import DiscordBot
    guild = DiscordBot._bot.get_guild(int(guild_id))
    if not guild:
        return []
    channels = [c for c in guild.text_channels if c.permissions_for(guild.me).send_messages]

    channels_dict = [{'id': str(c.id), 'name': str(c.name)} for c in channels]
    return channels_dict

def get_persistent_message(message_db_id):
    message = DiscordBotMessage.query.filter_by(id=message_db_id).first()
    return message

def get_params_for_message(message_db_id):
    message = get_persistent_message(message_db_id)
    if not message:
        return None
    
    return message.view_data

def set_bot_guild_id(guild_id):
    from jams import DiscordBot
    DiscordBot._guild_id = guild_id

def fetch_discord_user_nickname(account_id):
    from jams import DiscordBot
    future = run_coroutine_threadsafe(DiscordBot.fetch_discord_user_nickname_async(account_id), DiscordBot._loop)
    return future.result(timeout=5)

def set_discord_user_nickname(account_id, new_nick):
    from jams import DiscordBot
    future = run_coroutine_threadsafe(DiscordBot.set_discord_user_nickname_async(account_id, new_nick), DiscordBot._loop)
    return future.result(timeout=5)