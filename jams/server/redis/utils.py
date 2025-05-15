from __future__ import annotations

import json
from datetime import datetime, UTC
from typing import TYPE_CHECKING

from common.extensions import redis_client as client
from common.redis.keys import RedisKeys

# Only used for type hinting
if TYPE_CHECKING:
    from server.discord.bot import DiscordBotServer

def set_jolt_status(online=False):
    status = 'offline'
    if online:
        status = 'online'
    
    client.set(RedisKeys.JOLT_CONNECTION_STATUS, status)

def clear_discord_keys():
    client.delete(RedisKeys.DISCORD_BOT_STATUS)
    client.delete(RedisKeys.DISCORD_BOT_CONFIG)

def set_discord_bot_status(DiscordBot:DiscordBotServer):
    running = DiscordBot._is_running
    ready = DiscordBot.is_ready()

    data = {'running': running}
    if running:
        data.update({
            'ready': ready,
            'uptime': datetime.now(UTC).isoformat()
        })
    client.set(RedisKeys.DISCORD_BOT_STATUS, json.dumps(data))

def set_discord_bot_config(DiscordBot:DiscordBotServer):
    data = {}
    if DiscordBot.is_ready():
        data = {
            'client_id': DiscordBot.get_bot_client_id(),
            'guild_id': DiscordBot._guild_id,
            'guild_list': DiscordBot._guild_list
        }

        if DiscordBot._guild_id is not None:
            guild = DiscordBot._bot.get_guild(int(DiscordBot._guild_id))
            if not guild:
                return []
            channels = [c for c in guild.text_channels if c.permissions_for(guild.me).send_messages]

            channels_dict = [{'id': str(c.id), 'name': str(c.name)} for c in channels]
            data.update({
                'guild_channel_list': channels_dict
            })
            
    client.set(RedisKeys.DISCORD_BOT_CONFIG, json.dumps(data))
