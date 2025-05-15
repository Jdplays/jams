from . import db
from sqlalchemy  import Boolean, Column, ForeignKey, String, Integer
from sqlalchemy.orm import relationship, backref, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from uuid import UUID

class Config(db.Model):
    __tablename__ = 'config'

    id = Column(Integer, primary_key=True)
    key = Column(String, nullable=False, unique=True)
    value = Column(String, nullable=True)
    private = Column(Boolean, nullable=False)
    
    def __int__(self, key, value, private=True):
        self.key = key
        self.value = value
        self.private = private
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'private': self.private
        }
    
class UserConfig(db.Model):
    __tablename__ = 'user_config'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer(), ForeignKey('user.id'), nullable=False, unique=True)
    discord_account_id = Column(String(), nullable=True, unique=True)
    discord_username = Column(String(), nullable=True)
    discord_show_username = Column(Boolean(), default=False, server_default='false')
    discord_sync_streaks = Column(Boolean(), default=False, server_default='false')
    discord_last_reminder_message_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey('discord_bot_message.id'), nullable=True)

    user = relationship('User', backref=backref('config', uselist=False))
    last_discord_reminder_message = relationship('DiscordBotMessage')

    def __init__(self, user_id):
        self.user_id = user_id

    def unlink_discord(self):
        self.discord_account_id = None
        self.discord_username = None
        self.discord_show_username = False
        self.discord_sync_streaks = False
        self.discord_last_reminder_message_id = None

        db.session.commit()

    def to_dict(self):
        return_obj = {}
        from common.configuration import ConfigType, get_config_value
        if get_config_value(ConfigType.DISCORD_BOT_ENABLED):
            return_obj.update({
                'discord_account_id': self.discord_account_id,
                'discord_username': self.discord_username,
                'discord_show_username': self.discord_show_username,
                'discord_last_reminder_message_id': self.discord_last_reminder_message_id
            })
            if get_config_value(ConfigType.STREAKS_ENABLED):
                return_obj.update({
                    'discord_sync_streaks': self.discord_sync_streaks
                })

        return return_obj
    
    def public_info_dict(self):
        return_obj = {}
        from common.configuration import ConfigType, get_config_value
        if get_config_value(ConfigType.DISCORD_BOT_ENABLED):
            if self.discord_show_username:
                return_obj.update({
                    'discord_show_username': self.discord_show_username,
                    'discord_account_id': self.discord_account_id,
                    'discord_username': self.discord_username
                })

        return return_obj