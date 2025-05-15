# API is for serving data to TypeScript/JavaScript
from flask import Blueprint, request, jsonify

from common.integrations import discord
from common.configuration import ConfigType, get_config_value, set_config_value, remove_config_entry
from common.redis import utils as redis_utils

from web.util.decorators import api_route
from web.util.sse import sse_stream

bp = Blueprint('discord', __name__, url_prefix='/discord')

# URL PREFIX = /api/v1

@bp.route('/config', methods=['GET'])
@api_route
def get_config():
    discord_config = {}

    enabled = get_config_value(ConfigType.DISCORD_BOT_ENABLED)
    if enabled == None:
        enabled = False

    discord_config = discord.discord_config_dict()

    if enabled:
        guild_name = discord.get_guild_name(discord_config[ConfigType.DISCORD_BOT_GUILD_ID.name])
        if not guild_name:
            return jsonify({
                'message': 'ERROR_GUILD_NOT_FOUND',
                'data': discord_config
            }), 400
        
        discord_config['DISCORD_BOT_GUILD_NAME'] = guild_name

    return jsonify({'data': discord_config})

@bp.route('/config', methods=['POST'])
@api_route
def edit_config():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    announcements_channel = data.get(ConfigType.DISCORD_BOT_ANNOUNCEMENT_CHANNEL_ID.name)
    dm_reminders = data.get(ConfigType.DISCORD_BOT_DM_ENABLED.name)
    name_sync = data.get(ConfigType.DISCORD_BOT_NAME_SYNC_ENABLED.name)

    if not discord.verify_channel_id(announcements_channel):
        return jsonify({'message': 'Channel does not exist in bot'}), 400
    
    set_config_value(ConfigType.DISCORD_BOT_ANNOUNCEMENT_CHANNEL_ID, announcements_channel)
    set_config_value(ConfigType.DISCORD_BOT_DM_ENABLED, dm_reminders)
    set_config_value(ConfigType.DISCORD_BOT_NAME_SYNC_ENABLED, name_sync)

    discord_config = discord.discord_config_dict()
    
    guild_name = discord.get_guild_name(discord_config[ConfigType.DISCORD_BOT_GUILD_ID.name])
    if not guild_name:
        return jsonify({
            'message': 'ERROR_GUILD_NOT_FOUND',
            'data': discord_config
        }), 400
    
    discord_config['DISCORD_BOT_GUILD_NAME'] = guild_name

    return jsonify({'data': discord_config})

@bp.route('/verify', methods=['POST'])
@api_route
def verify_bot_token():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    token = data.get(ConfigType.DISCORD_BOT_TOKEN.name)
    if token == None:
        return jsonify({'message': 'Private token not provided'}), 400
    
    verified = discord.verify_bot_token(token)
    return jsonify({'verified': verified})

@bp.route('/verify_secret', methods=['POST'])
@api_route
def verify_client_secret():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    secret = data.get(ConfigType.DISCORD_CLIENT_SECRET.name)
    if secret == None:
        return jsonify({'message': 'Client Secret not provided'}), 400
    
    verified = discord.verify_client_secret(secret)
    return jsonify({'verified': verified})

@bp.route('/setup-status', methods=['GET'])
@api_route
def get_setup_status():
    state = {
        'status': 'STARTING',
        'client_id': None,
        'guild_list': []
    }

    def fetch_data():
        bot_status = redis_utils.get_discord_bot_status()
        if state['status'] == 'STARTING':
            if not bot_status.get('running'):
                discord.start_server()
                return {'status': 'STARTING'}
            elif bot_status.get('ready'):
                state['status'] = 'READY'

        bot_config = redis_utils.get_discord_bot_config()
        if state['status'] == 'READY':
            client_id = bot_config.get('client_id')
            if client_id:
                state['client_id'] = str(client_id)
        
        if state['status'] == 'READY':
            guild_list = bot_config.get('guild_list')
            state['guild_list'] = guild_list
        
        return {
            'status': state['status'],
            'client_id': state['client_id'],
            'guild_list': state['guild_list']
        }
    
    return sse_stream(fetch_data)

@bp.route('/enable', methods=['POST'])
@api_route
def enable():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    guild_id = data.get(ConfigType.DISCORD_BOT_GUILD_ID.name)
    if guild_id == None:
        return jsonify({'message': 'Guild ID not provided'}), 400
    
    if not discord.verify_guild_id(guild_id):
        return jsonify({'message': 'Bot is no associated with provided guild'}), 400
    
    discord.set_bot_guild_id(guild_id)
    set_config_value(ConfigType.DISCORD_BOT_GUILD_ID, guild_id)
    set_config_value(ConfigType.DISCORD_BOT_ENABLED, True)

    discord_config = discord.discord_config_dict()

    guild_name = discord.get_guild_name(guild_id)
    if not guild_name:
        return jsonify({
            'message': 'ERROR_GUILD_NOT_FOUND',
            'data': discord_config
        }), 400
    
    discord_config['DISCORD_BOT_GUILD_NAME'] = guild_name

    return jsonify({
        'message': 'Discord Integration enabled',
        'data': discord_config
    })

@bp.route('/disable', methods=['POST'])
@api_route
def disable():
    for config in discord.configItems:
        remove_config_entry(config)

    discord.stop_server()

    discord_config = discord.discord_config_dict()

    return jsonify({
        'message': 'Discord Integration disabled',
        'data': discord_config
    })