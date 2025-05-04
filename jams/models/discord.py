from . import db
from sqlalchemy  import Boolean, Column, DateTime, ForeignKey, String, Integer, JSON, text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from uuid import UUID
from datetime import datetime, UTC

class DiscordBotMessage(db.Model):
    __tablename__ = 'discord_bot_message'

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    message_id = Column(String(), nullable=False)
    channel_id = Column(String(), nullable=False)

    account_id = Column(String(), nullable=True)
    user_id = Column(Integer(), ForeignKey('user.id'), nullable=True)

    event_id = Column(Integer(), ForeignKey('event.id'), nullable=True)
    message_type = Column(String, nullable=False)
    view_type = Column(String, nullable=True)
    view_data = Column(JSON, nullable=True)

    timestamp = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True)
    updated = Column(Boolean, default=False)
    
    event = relationship('Event', backref='discord_messages')
    user = relationship('User', backref='discord_messages')
    
    def __init__(self, message_id, channel_id, message_type, user_id = None, account_id=None, event_id=None, view_type=None, view_data=None, id=None):
        if id is not None:
            self.id = id
        self.message_id = message_id
        self.channel_id = channel_id
        self.user_id = user_id
        self.account_id = account_id
        self.event_id = event_id
        self.message_type = message_type
        self.view_type = view_type
        self.view_data = view_data
        self.timestamp = datetime.now(UTC)
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'channel_id': self.channel_id,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'event_id': self.event_id,
            'message_type': self.message_type,
            'view_type': self.view_type,
            'view_data': self.view_data,
            'timestamp': self.timestamp,
            'active': self.active,
            'updated': self.updated
        }