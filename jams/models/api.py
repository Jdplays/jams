from datetime import UTC, datetime

from jams.util import helper
from . import db
from sqlalchemy  import Boolean, Column, DateTime, ForeignKey, String, Integer, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID, uuid4
from enum import Enum

from . import db
from jams.util import helper

class EndpointGroup(db.Model):
    __tablename__ = 'endpoint_group'
    id = Column(Integer(), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(String(255), nullable=False)

    def __init__(self, name, description):
        self.name = name
        self.description = description

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }

class Endpoint(db.Model):
    __tablename__ = 'endpoint'

    id = Column(Integer(), primary_key=True)
    name = Column(String(255), nullable=False)
    endpoint = Column(String(255), nullable=False)
    read = Column(Boolean, nullable=False, default=False, server_default='false')
    write = Column(Boolean, nullable=False, default=False, server_default='false')
    endpoint_group_id = Column(Integer, ForeignKey('endpoint_group.id'), nullable=False)

    webhook = relationship('EndpointGroup', backref='endpoints')

    def __init__(self, name, endpoint, endpoint_group_id, read=False, write=False):
        self.name = name
        self.endpoint = endpoint
        self.read = read
        self.write = write
        self.endpoint_group_id = endpoint_group_id

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'endpoint': self.endpoint,
            'read': self.read,
            'write': self.write,
            'endpoint_group_id': self.endpoint_group_id
        }


class Webhook(db.Model):
    __tablename__ = 'webhook'

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    name = Column(String(100), nullable=False, unique=False)
    action_enum = Column(String(100), nullable=False)
    external_id = Column(String, nullable=True)
    authenticated = Column(Boolean, nullable=False, default=True, server_default='true')
    auth_token: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    owner = Column(String(100), nullable=False, default='SYSTEM', server_default='SYSTEM')
    active = Column(Boolean, nullable=False, default=True, server_default='true')

    def __init__(self, name, action_enum, external_id=None, authenticated=True, auth_token=uuid4(), owner='SYSTEM', active=True):
        self.name = name
        self.action_enum = action_enum
        self.external_id = external_id
        self.authenticated = authenticated
        if self.authenticated:
            self.auth_token = auth_token
        self.owner = owner
        self.active = active
    
    def archive(self):
        self.active = False
        self.log('archived')

    def activate(self):
        self.active = True
        self.log('activated')
    
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
    
    @staticmethod
    def size():
        return helper.get_table_size(WebhookLog.__tablename__)
    
    def to_dict(self):
        date_time = helper.convert_datetime_to_local_timezone(self.date_time)
        return {
            'id': self.id,
            'webhook_id': self.webhook_id,
            'date_time': date_time.isoformat(),
            'log': self.log,
            'success': self.success
        }

class ExternalAPILog(db.Model):
    __tablename__ = 'external_api_log'

    id = Column(Integer(), primary_key=True)
    date_time = Column(DateTime, nullable=False, default=datetime.now(UTC))
    url = Column(String, nullable=False)
    status_code = Column(Integer, nullable=False)

    def __init__(self, url, status_code):
        self.date_time = datetime.now(UTC)
        self.url = url
        self.status_code = status_code

    @staticmethod
    def size():
        return helper.get_table_size(ExternalAPILog.__tablename__)
    
    def to_dict(self):
        date_time = helper.convert_datetime_to_local_timezone(self.date_time)
        return {
            'id': self.id,
            'date_time': date_time.isoformat(),
            'url': self.url,
            'status_code': self.status_code
        }