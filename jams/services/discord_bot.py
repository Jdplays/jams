import asyncio
import threading
import discord
from discord.ext import commands
from jams.configuration import ConfigType, get_config_value, set_config_value
from jams.services import discord_ui
from jams.models import db, DiscordBotMessage
from jams.util.enums import DiscordMessageViews
from jams.integrations.discord import get_params_for_message
from jams.util import helper
from jams import logger

class DiscordBotServer:
    def __init__(self):
        self._app = None
        self._bot = None
        self._client = None
        self._loop = None
        self._thread = None
        self._is_running = False
        self._ready_event = asyncio.Event()
        self._guild_list = []
        self._rsvp_selection_store = {}

    
    def init_app(self, app):
        self._app = app
        if get_config_value(ConfigType.DISCORD_BOT_ENABLED):
            self.start()
    
    async def wait_until_ready(self):
        await self._ready_event.wait()

    def is_ready(self):
        return self._ready_event.is_set()

    def get_bot_client_id(self):
        if self.is_ready() and self._bot.user:
            return self._bot.user.id
        return None

    def get_guild_list(self):
        return self._guild_list if self.is_ready() else []

    def start(self):
        if self._is_running:
            logger.info("[DiscordBot] Already running.")
            return

        token = get_config_value(ConfigType.DISCORD_BOT_TOKEN)
        if not token:
            logger.error("[DiscordBot] No token found. Skipping bot startup.")
            return

        intents = discord.Intents.default()
        intents.guilds = True
        intents.messages = True
        intents.message_content = True
        intents.guild_messages = True

        self._bot = commands.Bot(command_prefix='!', intents=intents)
        self._client = discord.Client(intents=intents)

        @self._bot.event
        async def on_ready():
            logger.info(f'[DiscordBot] Logged in as {self._bot.user} (ID: {self._bot.user.id})')
            self.save_guild_list()
            self._ready_event.set()
            client_id = self.get_bot_client_id()

            # Register persistent handlers globally
            self._bot.add_view(discord_ui.RSVPView(message_db_id='1', url='https://example.com'))
            #self._bot.add_view(discord_ui.RSVPSelect())

            with self._app.app_context():
                set_config_value(ConfigType.DISCORD_CLIENT_ID, client_id)
                await self.restore_bot_views()

        @self._bot.event
        async def on_guild_join(guild):
            logger.info(f'[DiscordBot] Joined guild: {guild.name} ({guild.id})')
            self.add_guild_to_guilds_list(guild)
            default_channel = next((c for c in guild.text_channels if c.permissions_for(guild.me).send_messages), None)
            if default_channel:
                await default_channel.send(
                    "👋 Hi! Please return to JAMS to finish linking this Discord server."
                )
        
        # Interaction Router
        @self._bot.event
        async def on_interaction(interaction: discord.Interaction):
            if interaction.type == discord.InteractionType.component:
                custom_id = interaction.data.get("custom_id", "")
                
                # Check if its an open rsvp modal interaction
                if custom_id.startswith("open_rsvp_modal:"):
                    _, message_db_id = custom_id.split(":", 1)

                    selected_values = interaction.data.get("values", [])

                    with self._app.app_context():
                        params = get_params_for_message(message_db_id)
                        self.store_rsvp_selection(message_db_id, selected_values)

                        await interaction.response.send_modal(discord_ui.RSVPModal(message_db_id=message_db_id, **params))


        def run_bot():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            self._loop = loop

            async def main():
                try:
                    self._is_running = True
                    await self._bot.start(token)
                except Exception as e:
                    logger.error(f"[DiscordBot] Failed to run: {e}")
                finally:
                    self._is_running = False
            
            try:
                loop.run_until_complete(main())
            finally:
                logger.info("[DiscordBot] Cleaning up event loop...")
                loop.run_until_complete(self._bot.close())
                loop.close()

        self._thread = threading.Thread(target=run_bot, daemon=True)
        self._thread.start()

    def stop(self):
        if not self._is_running:
            logger.info("[DiscordBot] Not running.")
            return

        logger.info("[DiscordBot] Shutting down bot...")


        async def shutdown():
            await self._bot.close()
            logger.info("[DiscordBot] Bot closed.")
            self._is_running = False


        if self._loop and self._loop.is_running():
            try:
                future = asyncio.run_coroutine_threadsafe(shutdown(), self._loop)
                future.result(timeout=10)
                logger.info("[DiscordBot] Shutdown completed.")
            except Exception as e:
                logger.error(f"[DiscordBot] Failed to shut down bot: {e}")
            
            # Wait for the bot thread to exit
            if self._thread:
                self._thread.join(timeout=5)
                logger.info("[DiscordBot] Bot thread joined.")

            # Clean up references so we know it’s shut down
            self._thread = None
            self._loop = None
            self._bot = None
            self._client = None
            self._is_running = False
            self._ready_event = asyncio.Event()

            logger.info("[DiscordBot] Shutdown complete.")
        else:
            logger.warning("[DiscordBot] Event loop is not running; skipping shutdown coroutine.")

    def send_message_to_channel(self, channel_id, message):
        guild_id = get_config_value(ConfigType.DISCORD_BOT_GUILD_ID)

        async def _send():
            guild = self._bot.get_guild(guild_id)
            if not guild:
                logger.warning(f"[DiscordBot] Guild {guild_id} not found.")
                return
            channel = guild.get_channel(channel_id)
            if not channel:
                logger.warning(f"[DiscordBot] Channel {channel_id} not found.")
                return
            await channel.send(message)

        if self._loop and self._is_running:
            asyncio.run_coroutine_threadsafe(_send(), self._loop)
    
    def send_dm_to_user(self, user_id, discord_user_id, message):
        async def _send():
            user = await self._bot.fetch_user(discord_user_id)
            try:
                if user is not None:
                    return await user.send(message)
                else:
                    logger.warning(f"[DiscordBot] User {user_id} not found")
            except discord.Forbidden:
                logger.warning(f"[DiscordBot] Cannot DM user {user_id}")
            except Exception as e:
                logger.error(f"[DiscordBot] Error sending DM to user {user_id}: {e}")
        
        if self._loop and self._is_running:
            future = asyncio.run_coroutine_threadsafe(_send(), self._loop)
            return future.result(timeout=10)
    
    def send_rsvp_reminder(self, user_id, url, message_db_id):
        async def _send():
            user = await self._bot.fetch_user(user_id)
            try:
                if user is not None:
                    view = discord_ui.RSVPView(url=url, message_db_id=message_db_id)
                    return await user.send("📅 **Are you going to the event?**", view=view)
                else:
                    logger.warning(f"[DiscordBot] User {user_id} not found")
            except discord.Forbidden:
                logger.warning(f"[DiscordBot] Cannot DM user {user_id}")
            except Exception as e:
                logger.error(f"[DiscordBot] Error sending DM to user {user_id}: {e}")
        
        if self._loop and self._is_running:
            future = asyncio.run_coroutine_threadsafe(_send(), self._loop)
            return future.result(timeout=10)

    
    def save_guild_list(self):
        guilds = self._bot.guilds
        if not guilds:
            return
        
        for guild in guilds:
            self.add_guild_to_guilds_list(guild)
        
    def add_guild_to_guilds_list(self, guild):      
        existing_ids = {item['id'] for item in self._guild_list}
        if str(guild.id) not in existing_ids:
            self._guild_list.append({'id': str(guild.id), 'name': str(guild.name)})

    async def restore_bot_views(self):
        messages = DiscordBotMessage.query.filter(DiscordBotMessage.active == True, DiscordBotMessage.view_type != None).all()
        for msg in messages:
            expired = False

            if msg.event_id and helper.is_event_over(event_id=msg.event_id):
                expired = True
            
            try:
                if msg.account_id is not None:
                    # This is a DM
                    try:
                        user = await self._bot.fetch_user(msg.account_id)
                        channel = await user.create_dm()
                    except discord.NotFound:
                        logger.warning(f"[DiscordBot] User {msg.account_id} not found")
                        continue
                    except Exception as e:
                        logger.error(f"[DiscordBot] Error creating DM with user {msg.account_id}: {e}")
                        continue
                else:
                    # This is a guild channel
                    channel = self._bot.get_channel(msg.channel_id)
                    if channel is None:
                        try:
                            # Fallback to fetch in case it's not cached
                            channel = await self._bot.fetch_channel(msg.channel_id)
                        except discord.NotFound:
                            logger.warning(f"[DiscordBot] Channel {msg.channel_id} not found (possibly deleted)")
                            continue
                        except Exception as e:
                            logger.error(f"[DiscordBot] Error fetching channel {msg.channel_id}: {e}")
                            continue
                
                if not channel:
                    continue

                if expired:
                    try:
                        discord_message = await channel.fetch_message(msg.message_id)
                        await discord_message.edit(content="⚠️ This RSVP has expired.", view=None)
                    except Exception as e:
                        logger.warning(f"[DiscordBot] Could not update expired message {msg.message_id}: {e}")
                    msg.active = False
                else:
                    view = self.get_view_from_type(msg.id, msg.view_type, msg.view_data)
                    if view:
                        self._bot.add_view(view, message_id=msg.message_id)
                        logger.info(f"[DiscordBot] Reattached view to message {msg.message_id}")
                    else:
                        logger.warning(f"[DiscordBot] Unknown view_type: {msg.view_type}")
            except Exception as e:
                logger.error(f"[DiscordBot] Failed to restore view for message {msg.message_id}: {e}")
            finally:
                db.session.commit()

    def get_view_from_type(self, message_db_id, view_type, view_params):
        match view_type:
            case DiscordMessageViews.RSVP_REMINDER_VIEW.name:
                return discord_ui.RSVPView(message_db_id=message_db_id, **view_params)
            case _:
                return None
    

    def store_rsvp_selection(self, message_db_id, selection):
        self._rsvp_selection_store[message_db_id] = selection
    
    def pop_rsvp_selection(self, message_db_id):
        return self._rsvp_selection_store.pop(message_db_id, [])