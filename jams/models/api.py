from datetime import UTC, datetime
from . import db
from sqlalchemy  import Boolean, Column, DateTime, ForeignKey, String, Integer, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID, uuid4


class Webhook(db.Model):
    __tablename__ = 'webhook'

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    name = Column(String(100), nullable=False, unique=True)
    action_enum = Column(String(100), nullable=False)
    external_id = Column(String, nullable=True)
    authenticated = Column(Boolean, nullable=False, default=True, server_default='true')
    auth_token: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=True)

    def __init__(self, name, action_enum, external_id=None, authenticated=True, auth_token=uuid4()):
        self.name = name
        self.action_enum = action_enum
        self.external_id = external_id
        self.authenticated = authenticated
        self.auth_token = auth_token
    
    def log(self, message, success=True):
        log = WebhookLog(webhook_id=self.id, log=f'Webhook - {self.id}: {message}', success=success)
        db.session.add(log)
        db.session.commit()

    def log_success(self):
        self.log('successfully executed')


class WebhookLog(db.Model):
    __tablename__ = 'webhook_log'

    id = Column(Integer(), primary_key=True)
    webhook_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey('webhook.id'), nullable=False)
    date_time = Column(DateTime, nullable=False, default=datetime.now(UTC))
    log = Column(String, nullable=False)
    success = Column(Boolean, nullable=False, default=True, server_default='true')

    webhook = relationship('Webhook', backref='logs')

    def __init__(self, webhook_id, log, success=True):
        self.webhook_id = webhook_id
        self.date_time = datetime.now(UTC)
        self.log = log
        self.success = success
