import inspect
from asyncio import run_coroutine_threadsafe

from common.models.discord import DiscordBotMessage
from common.util import helper
from common.util.enums import DiscordMessageType, DiscordMessageView
from common.configuration import ConfigType, get_config_value
from common.models import db, User, UserConfig

DiscordBot = None

def _get_discord_bot():
    global DiscordBot
    if DiscordBot is None:
        from server import DiscordBot as _Bot
        DiscordBot = _Bot
    return DiscordBot

# Discord temporary RSVP value store
_rsvp_selection_store = {}

def store_rsvp_selection(message_db_id, selection):
    _rsvp_selection_store[message_db_id] = selection

def pop_rsvp_selection(message_db_id):
    return _rsvp_selection_store.pop(message_db_id, [])

def make_stub_view(view_class:type):
    sig = inspect.signature(view_class.__init__)
    kwargs = {}
    
    for name, param in sig.parameters.items():
        if name in ('self', 'args', 'kwargs'):
            continue
        kwargs[name] = 'placeholder'
    
    return view_class(**kwargs)

def class_has_init_param(cls, param_name: str) -> bool:
    sig = inspect.signature(cls.__init__)
    return param_name in sig.parameters


def fetch_discord_user_nickname(account_id):
    bot = _get_discord_bot()
    future = run_coroutine_threadsafe(bot.fetch_discord_user_nickname_async(account_id), bot._loop)
    return future.result(timeout=5)

def set_discord_user_nickname(account_id, new_nick):
    bot = _get_discord_bot()
    future = run_coroutine_threadsafe(bot.set_discord_user_nickname_async(account_id, new_nick), bot._loop)
    return future.result(timeout=5)

def sync_discord_nicknames(user_id=None):
    is_global_nickname_sync_enabled = get_config_value(ConfigType.DISCORD_BOT_NAME_SYNC_ENABLED)

    discord_enabled_users_query = (
        db.session.query(User)
        .outerjoin(UserConfig, User.id == UserConfig.user_id)
        .filter(UserConfig.discord_account_id != None)
    )

    if user_id is not None:
        discord_enabled_users_query = discord_enabled_users_query.filter(User.id == user_id)
    
    discord_enabled_users = discord_enabled_users_query.all()


    for user in discord_enabled_users:
        current_nickname = fetch_discord_user_nickname(user.config.discord_account_id)
        new_nickname = current_nickname

        if is_global_nickname_sync_enabled:
            new_nickname = user.display_name.strip()
        
        if user.config.discord_sync_streaks:
            new_nickname = f'{new_nickname} - {user.attendance_streak.streak}🔥'.strip()
        
        set_discord_user_nickname(user.config.discord_account_id, new_nickname)