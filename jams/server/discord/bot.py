import asyncio
import threading
from uuid import uuid4
import discord
from discord.ext import commands

from common.configuration import ConfigType, get_config_value, set_config_value
from common.models import db, DiscordBotMessage
from common.util.enums import DiscordMessageType, DiscordMessageView
from common.util import helper
from common.extensions import get_logger

# Import all handlers to have them registered
from server.discord import handlers
from server.discord.interaction_router import INTERACTION_HANDLERS
from server.discord.ui import VIEW_REGISTRY
from server.discord.helper import make_stub_view
from server.redis.utils import set_discord_bot_status, set_discord_bot_config

class DiscordBotServer:
    def __init__(self):
        self._app = None
        self._bot = None
        self._client = None
        self._token = None
        self._loop = None
        self._thread = None
        self._is_running = False
        self._guild_id = None
        self._ready_event = threading.Event()
        self._guild_list = []
        self.logger = get_logger('DiscordBot')

    
    def init_app(self, app):
        self._app = app
    
    def wait_until_ready(self, timeout=None):
        self._ready_event.wait(timeout=timeout)

    def is_ready(self):
        return self._ready_event.is_set()

    def get_bot_client_id(self):
        if self.is_ready() and self._bot.user:
            return self._bot.user.id
        return None

    def get_guild_list(self):
        return self._guild_list if self.is_ready() else []
    
    def run_bot(self):
        try:
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            self._is_running = True
            
            # Run the bot in this threads event loop
            self._loop.run_until_complete(self._bot.start(self._token))
        except Exception as e:
            self.logger.error(f"[DiscordBot] Failed to run: {e}")
        finally:
            self.logger.info("[DiscordBot] Cleaning up event loop...")
            self._is_running = False
            self._ready_event.clear()
            self._loop.run_until_complete(self._bot.close())
            self._loop.run_until_complete(self._loop.shutdown_asyncgens())

            pending = asyncio.all_tasks(loop=self._loop)
            if pending:
                self.logger.info(f"[DiscordBot] Awaiting {len(pending)} pending tasks...")
                self._loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))

            self._loop.close()
            self.logger.info("[DiscordBot] Shutdown complete")


    def start(self):
        if self._is_running:
            self.logger.info("[DiscordBot] Already running.")
            return

        self._token = get_config_value(ConfigType.DISCORD_BOT_TOKEN)
        if not self._token:
            self.logger.error("[DiscordBot] No token found. Skipping bot startup.")
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
            self._ready_event.set()
            self.logger.info(f'[DiscordBot] Logged in as {self._bot.user} (ID: {self._bot.user.id})')
            self.save_guild_list()

            # Register persistent handlers globally
            for view_type, view_class in VIEW_REGISTRY.items():
                try:
                    stub_view = make_stub_view(view_class)
                    self._bot.add_view(stub_view)
                    self.logger.info(f"[DiscordBot] Registered persistent view: {view_type}")
                except Exception as e:
                    self.logger.warning(f"[DiscordBot] Failed to register view {view_type}: {e}")

            client_id = self.get_bot_client_id()
            
            with self._app.app_context():
                set_config_value(ConfigType.DISCORD_CLIENT_ID, client_id)
                await self.restore_bot_views()
                self._guild_id = get_config_value(ConfigType.DISCORD_BOT_GUILD_ID)
            
            set_discord_bot_status(self)
            set_discord_bot_config(self)

        @self._bot.event
        async def on_guild_join(guild):
            self.logger.info(f'[DiscordBot] Joined guild: {guild.name} ({guild.id})')
            self.add_guild_to_guilds_list(guild)
            default_channel = next((c for c in guild.text_channels if c.permissions_for(guild.me).send_messages), None)
            if default_channel:
                await default_channel.send(
                    "👋 Hi! Please return to JAMS to finish linking this Discord server."
                )
            set_discord_bot_config(self)
        
        # Interaction Router
        @self._bot.event
        async def on_interaction(interaction: discord.Interaction):
            custom_id = interaction.data.get("custom_id", "")
            if ":" not in custom_id:
                return  # Invalid format, ignore
            
            prefix, message_db_id = custom_id.split(":", 1)
            if not message_db_id:
                self.logger.warning(f"[DiscordBot] Invalid message ID in custom_id: {custom_id}")
                return
            
            for registered_prefix, handler in INTERACTION_HANDLERS.items():
                if prefix.startswith(registered_prefix):
                    try:
                        with self._app.app_context():
                            await handler(interaction, message_db_id)
                    except Exception as e:
                        self.logger.error(f"[DiscordBot] Error handling interaction '{custom_id}': {e}")
                    return
            
            self.logger.warning(f"[DiscordBot] No handler found for custom_id: {custom_id}")


        self._ready_event.clear()
        self._thread = threading.Thread(target=self.run_bot, daemon=True)
        self._thread.start()

        set_discord_bot_status(self)


    def stop(self):
        if not self._is_running or not self._bot or not self._loop:
            self.logger.info("[DiscordBot] Not running.")
            return

        self.logger.info("[DiscordBot] Shutting down bot...")

        try:
            # Schedule bot.close() safely in the bot's loop
            self._loop.call_soon_threadsafe(asyncio.create_task, self._bot.close())
            
            # Wait for the bot thread to finish
            if self._thread and self._thread.is_alive():
                self._thread.join(timeout=10)

        except Exception as e:
            self.logger.error(f"[DiscordBot] Failed to shut down bot: {e}")

        # Clean up
        self._bot = None
        self._client = None
        self._token = None
        self._loop = None
        self._thread = None
        self._guild_id = None
        self._guild_list = []
        self._ready_event.clear()
        self._is_running = False

        set_discord_bot_status(self)
        set_discord_bot_config(self)


    def send_message_to_channel(self, channel_id, message):
        async def _send():
            guild = self.get_configured_guild()
            if not guild:
                self.logger.warning(f"[DiscordBot] Guild {self._guild_id} not found.")
                return
            channel = guild.get_channel(channel_id)
            if not channel:
                self.logger.warning(f"[DiscordBot] Channel {channel_id} not found.")
                return
            await channel.send(message)

        if self._loop and self._is_running:
            asyncio.run_coroutine_threadsafe(_send(), self._loop)
    
    async def send_dm_to_user_async(self, user_id, discord_user_id, message, message_type, view_type=None, view_data=None, event_id=None, active=True):
        with self._app.app_context():
            user = await self._bot.fetch_user(discord_user_id)
            try:
                if not user:
                    self.logger.warning(f"[DiscordBot] User {user_id} not found")
                
                message_db_id = uuid4()

                send_kwargs = {}
                send_kwargs['content'] = message

                # Create a view if a view type is provided
                view_instance = self.get_view_from_type(message_db_id, view_type, view_data)
                send_kwargs['view'] = view_instance

                # Send the message
                if send_kwargs:
                    sent_message = await user.send(**send_kwargs)

                    # Save the message as a persistent message in the DB
                    if sent_message:
                        with self._app.app_context():
                            persistent_message = DiscordBotMessage(
                                id=message_db_id,
                                message_id=sent_message.id,
                                channel_id=sent_message.channel.id,
                                message_type=message_type.name,
                                user_id=user_id,
                                event_id=event_id,
                                account_id=discord_user_id,
                                view_type=view_type.name,
                                view_data=view_data
                            )

                            persistent_message.active = active
                            db.session.add(persistent_message)
                            db.session.commit()

                        return sent_message
            except discord.Forbidden:
                self.logger.warning(f"[DiscordBot] Cannot DM user {user_id}")
            except Exception as e:
                self.logger.error(f"[DiscordBot] Error sending DM to user {user_id}: {e}")
            
    def send_dm_to_user(self, *args, **kwargs):
        if self._loop and self._is_running:
            self._loop.call_soon_threadsafe(
                asyncio.create_task,
                self.send_dm_to_user_async(*args, **kwargs),
            )
        
    
    async def update_dm_to_user_async(self, message_db_id, expired=False, new_content=None, new_view_type=None, new_message_type=None, active=True):
        with self._app.app_context():
            # Get the message from the db
            msg_obj = DiscordBotMessage.query.filter_by(id=message_db_id).first()
            if not msg_obj:
                self.logger.warning(f"[DiscordBot] Persistent message {message_db_id} does not exist in the Database id. Skipping DM update...")
                return

            if not msg_obj.account_id:
                self.logger.warning(f"[DiscordBot] Persistent message {msg_obj.id} does not have a user account id. Skipping DM update...")
                return
            try:
                user = await self._bot.fetch_user(msg_obj.account_id)
                channel = await user.create_dm()
                discord_message = await channel.fetch_message(msg_obj.message_id)
                current_content = discord_message.content

                # Handle RSVP expiration override
                if expired and msg_obj.view_type == DiscordMessageView.RSVP_REMINDER_VIEW.name:
                    try:
                        updated_content = current_content.replace('Please fill out the form bellow:', '⚠️ This RSVP has expired.')
                        await discord_message.edit(content=updated_content, view=None)

                        msg_obj.view_type = None
                        msg_obj.view_data = None
                        msg_obj.message_type =  DiscordMessageType.RSVP_EXPIRED.name
                        msg_obj.active = False
                            
                    except Exception as e:
                        self.logger.warning(f"[DiscordBot] Could not update expired message {msg_obj.message_id}: {e}")
                    return

                # Create a new view if a new view type is provided
                view_instance = self.get_view_from_type(msg_obj.id, new_view_type, msg_obj.view_data)

                # Handle generic content/view update
                try:
                    edit_kwargs = {}
                    if new_content is not None:
                        edit_kwargs['content'] = new_content
                    if new_view_type is not None:
                        edit_kwargs['view'] = view_instance
                    
                    if edit_kwargs:
                        await discord_message.edit(**edit_kwargs)

                        msg_obj.message_type = new_message_type.name if new_message_type else msg_obj.message_type
                        msg_obj.view_type = new_view_type.name if new_view_type else msg_obj.view_type
                        msg_obj.active = active
                except Exception as e:
                    self.logger.warning(f"[DiscordBot] Could not update message {msg_obj.message_id}: {e}")
                    return

            except discord.NotFound:
                self.logger.warning(f"[DiscordBot] User {msg_obj.account_id} not found")
                return
            except Exception as e:
                self.logger.error(f"[DiscordBot] Error creating DM with user {msg_obj.account_id}: {e}")
                return
            finally:
                db.session.commit()
    
    def update_dm_to_user(self, *args, **kwargs):
        if self._loop and self._is_running:
            self._loop.call_soon_threadsafe(
                asyncio.create_task,
                self.update_dm_to_user_async(*args, **kwargs),
            )
        
    
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
        for msg_obj in messages:
            expired = False

            if msg_obj.event_id and helper.is_event_over(event_id=msg_obj.event_id):
                expired = True
            
            try:
                if msg_obj.account_id is not None:
                    # This is a DM
                    try:
                        user = await self._bot.fetch_user(msg_obj.account_id)
                        channel = await user.create_dm()
                    except discord.NotFound:
                        self.logger.warning(f"[DiscordBot] User {msg_obj.account_id} not found")
                        continue
                    except Exception as e:
                        self.logger.error(f"[DiscordBot] Error creating DM with user {msg_obj.account_id}: {e}")
                        continue
                else:
                    # This is a guild channel
                    channel = self._bot.get_channel(msg_obj.channel_id)
                    if channel is None:
                        try:
                            # Fallback to fetch in case it's not cached
                            channel = await self._bot.fetch_channel(msg_obj.channel_id)
                        except discord.NotFound:
                            self.logger.warning(f"[DiscordBot] Channel {msg_obj.channel_id} not found (possibly deleted)")
                            continue
                        except Exception as e:
                            self.logger.error(f"[DiscordBot] Error fetching channel {msg_obj.channel_id}: {e}")
                            continue
                
                if not channel:
                    continue

                if expired:
                    try:
                        discord_message = await channel.fetch_message(msg_obj.message_id)
                        await discord_message.edit(content="⚠️ This RSVP has expired.", view=None)
                    except Exception as e:
                        self.logger.warning(f"[DiscordBot] Could not update expired message {msg_obj.message_id}: {e}")
                    msg_obj.active = False
                else:
                    view_instance = self.get_view_from_type(msg_obj.id, msg_obj.view_type, msg_obj.view_data)
                    if view_instance:
                        self._bot.add_view(view_instance, message_id=msg_obj.message_id)
                        self.logger.info(f"[DiscordBot] Reattached view to message {msg_obj.message_id}")
                    else:
                        self.logger.warning(f"[DiscordBot] Unknown view_type: {msg_obj.view_type}")
            except Exception as e:
                self.logger.error(f"[DiscordBot] Failed to restore view for message {msg_obj.message_id}: {e}")
            finally:
                db.session.commit()

    def get_view_from_type(self, message_db_id, view_type, view_data):
        if type(view_type) == DiscordMessageView:
            view_type = view_type.value

        view_instance = None
        if view_type is not None:
            try:
                view_class = VIEW_REGISTRY.get(view_type)
                if view_class:
                    view_instance = view_class(message_db_id=message_db_id, **(view_data or {}))
                else:
                    self.logger.warning(f"[DiscordBot] No view class registered for {view_type}")
            except Exception as e:
                self.logger.warning(f"[DiscordBot] Failed to construct view for message {message_db_id}: {e}")

        return view_instance
    
    def get_configured_guild(self):
        if not self.is_ready():
            return None
        
        try:
            guild = self._bot.get_guild(int(self._guild_id))
            if not guild:
                self.logger.warning(f"[DiscordBot] Guild not found: '{self._guild_id}'")
                return None
            return guild
        except (ValueError, TypeError):
                self.logger.warning(f"[DiscordBot] Invalid guild ID type: {self._guild_id}")
                return None

    async def get_discord_member(self, account_id):
        guild = self.get_configured_guild()
        member = guild.get_member(int(account_id))
        if not member:
            try:
                member = await guild.fetch_member(int(account_id))
            except discord.NotFound:
                self.logger.warning(f"[DiscordBot] User {account_id} not found")
                return None
            except (ValueError, TypeError):
                self.logger.warning(f"[DiscordBot] Invalid account ID type: {account_id}")
                return None
        
        return member

    async def fetch_discord_user_nickname_async(self, account_id):
        if not self.is_ready():
            return None
        
        member = await self.get_discord_member(account_id)
        return member.nick or member.name

    async def set_discord_user_nickname_async(self, account_id, new_nick):
        if not self.is_ready():
            return None
        
        member = await self.get_discord_member(account_id)
        
        try:
            await member.edit(nick=new_nick)
            return True
        except discord.Forbidden:
            self.logger.warning(f"[DiscordBot] Unable to edit nickname for member: '{account_id}': Insufficient permissions")
            return False
        except Exception as e:
            self.logger.error(f"[DiscordBot] Unable to edit nickname for member '{account_id}': {e}")
            return False
        