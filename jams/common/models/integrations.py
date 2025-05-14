import hmac
import hashlib
from datetime import UTC, datetime
from sqlalchemy  import JSON, Boolean, Column, DateTime, Float, String, Integer, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID, uuid4
from enum import Enum

from . import db
from common.util.enums import JOLTPrintJobType, JOLTPrintQueueStatus, JOLTHealthCheckStatus

class JOLTPrintQueue(db.Model):
    __tablename__ = 'jolt_print_queue'

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    date_time = Column(DateTime, nullable=False, default=datetime.now(UTC))
    data = Column(JSON, nullable=False)
    retry_attempts_left = Column(Integer, nullable=False, default=3, server_default='3')
    last_attempt_date_time = Column(DateTime, nullable=True)
    status = Column(String(100), nullable=False, default=JOLTPrintQueueStatus.QUEUED.name, server_default=JOLTPrintQueueStatus.QUEUED.name)
    type = Column(String(100), nullable=False, default=JOLTPrintJobType.ATTENDEE_LABEL.name, server_default=JOLTPrintJobType.ATTENDEE_LABEL.name)
    error = Column(String(255), nullable=True)

    def __init__(self, data, type=JOLTPrintJobType.ATTENDEE_LABEL.name, status=JOLTPrintQueueStatus.QUEUED.name):
        self.date_time=datetime.now(UTC)
        self.data = data
        self.type = type
        self.status = status

class JOLTHealthCheck(db.Model):
    __tablename__ = 'jolt_healtcheck'

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    date_time = Column(DateTime, nullable=False, default=datetime.now(UTC))
    status = Column(String(100), nullable=False, default=JOLTHealthCheckStatus.PENDING.name, server_default=JOLTHealthCheckStatus.PENDING.name)
    cpu_usage = Column(Float, nullable=True)
    ram_usage = Column(Float, nullable=True)
    local_ip = Column(String(45), nullable=True)
    storage_usage = Column(Float, nullable=True)

    def __init__(self):
        self.date_time=datetime.now(UTC)

    def to_dict(self):
        return {
            'id': self.id,
            'date_time': self.date_time,
            'satus': self.status,
            'cpu_usage': self.cpu_usage,
            'ram_usage': self.ram_usage,
            'local_id': self.local_ip,
            'storage_usage': self.storage_usage,
        }
