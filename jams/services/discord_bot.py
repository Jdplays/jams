import asyncio
import threading
import discord
from discord.ext import commands
from jams.configuration import ConfigType, get_config_value, set_config_value
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
            with self._app.app_context():
                set_config_value(ConfigType.DISCORD_CLIENT_ID, client_id)

        @self._bot.event
        async def on_guild_join(guild):
            logger.info(f'[DiscordBot] Joined guild: {guild.name} ({guild.id})')
            self.add_guild_to_guilds_list(guild)
            default_channel = next((c for c in guild.text_channels if c.permissions_for(guild.me).send_messages), None)
            if default_channel:
                await default_channel.send(
                    "👋 Hi! Please return to JAMS to finish linking this Discord server."
                )

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