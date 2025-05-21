from . import db
from sqlalchemy  import Boolean, Column, DateTime, ForeignKey, String, Integer, text
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta, UTC
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import UUID

from common.util.enums import AttendeeSource

class Attendee(db.Model):
    __tablename__ = 'attendee'

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    name = Column(String(255), nullable=False)
    external_id = Column(String, nullable=True, unique=True)
    email = Column(String(255), nullable=False)
    checked_in = Column(Boolean, nullable=False, default=False, server_default='false')
    registerable = Column(Boolean, nullable=False, default=True, server_default='true')
    age = Column(Integer)
    gender = Column(String(50))
    external_order_id = Column(String, nullable=True)
    source = Column(String(100), nullable=False, default=AttendeeSource.LOCAL.name, server_default=AttendeeSource.LOCAL.name)
    attendee_account_id = Column(Integer(), ForeignKey('attendee_account.id'), nullable=True)
    last_update_source = Column(String(100), nullable=False, default=AttendeeSource.LOCAL.name, server_default=AttendeeSource.LOCAL.name)
    label_printed = Column(Boolean, nullable=False, default=False, server_default='false')
    canceled = Column(Boolean, nullable=False, default=False, server_default='false')

    event = relationship('Event', backref='attendees')
    attendee_account = relationship('AttendeeAccount', backref='attendees')

    def __init__(self, event_id, name, external_id=None, email=None, checked_in=False, registerable=True, age=None, gender=None, external_order_id=None, source=AttendeeSource.LOCAL.name, label_printed=False, canceled=False):
        self.event_id = event_id
        self.name = name
        self.external_id = external_id
        self.email = email
        self.checked_in = checked_in
        self.registerable = registerable
        self.age = age
        self.gender = gender
        self.external_order_id = external_order_id
        self.source = source
        self.last_update_source = self.source
        self.label_printed = label_printed
        self.canceled = canceled
    
    def link_to_account(self):
        # Link attendee to attendee account
        account = None
        if self.external_order_id:
            account =  db.session.query(AttendeeAccount).join(Attendee).filter(Attendee.external_order_id == self.external_order_id).first()

        if not account:
            account = AttendeeAccount.query.filter_by(email=self.email).first()
            
        if not account:
            account = AttendeeAccount(email=self.email)
            db.session.add(account)
            db.session.commit()
        self.attendee_account_id = account.id

        # Link event to attendee account
        account_event = AttendeeAccountEvent.query.filter_by(attendee_account_id=account.id, event_id=self.event_id).first()
        if not account_event:
            account_event = AttendeeAccountEvent(attendee_account_id=account.id, event_id=self.event_id)
            db.session.add(account_event)
            db.session.commit()
    
    def create_fire_list_entry(self):
        from common.models import FireList
        fire_list_entry = FireList.query.filter_by(event_id=self.event_id, attendee_id=self.id).first()

        if not fire_list_entry:
            fire_list_entry = FireList(event_id=self.event_id, attendee_id=self.id, checked_in=self.checked_in)
            db.session.add(fire_list_entry)
            db.session.commit()
        else:
            fire_list_entry.checked_in = self.checked_in
            db.session.commit()
    
    def log_check_in(self):
        log = AttendeeCheckInLog(self.id, self.event_id, self.checked_in)
        db.session.add(log)
        db.session.commit()

    def check_in(self, source=AttendeeSource.LOCAL):
        from common.configuration import ConfigType, get_config_value
        from common.integrations import jolt

        if self.last_update_source == AttendeeSource.LOCAL.name and source.name is not AttendeeSource.LOCAL.name:
            return
        
        self.checked_in = True
        self.create_fire_list_entry()
        self.log_check_in()

        if (get_config_value(ConfigType.JOLT_ENABLED) and not self.label_printed):
            jolt.add_attendee_to_print_queue(self)

    def check_out(self, source=AttendeeSource.LOCAL):
        if self.last_update_source == AttendeeSource.LOCAL.name and source.name is not AttendeeSource.LOCAL.name:
            return
        self.checked_in = False
        self.create_fire_list_entry()
        self.log_check_in()

    
    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'name': self.name,
            'external_id': self.external_id,
            'email': self.email,
            'checked_in': self.checked_in,
            'registerable': self.registerable,
            'age': self.age,
            'gender': self.gender,
            'external_order_id': self.external_order_id,
            'source': self.source,
            'attendee_account_id': self.attendee_account_id,
            'label_printed': self.label_printed,
            'canceled': self.canceled
        }
    
class AttendeeAccount(db.Model):
    __tablename__ = 'attendee_account'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, unique=True)

    def __init__(self, email):
        self.email = email


    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email
        }

class AttendeeAccountEvent(db.Model):
    __tablename__ = 'attendee_account_event'

    id = Column(Integer, primary_key=True)
    attendee_account_id = Column(Integer(), ForeignKey('attendee_account.id'), nullable=False)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)

    event = relationship('Event')
    attendee_account = relationship('AttendeeAccount')

    def __int__(self, attendee_account_id, event_id):
        self.attendee_account_id = attendee_account_id
        self.event_id = event_id

class AttendeeSignup(db.Model):
    __tablename__ = 'attendee_signup'

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    attendee_id = Column(Integer(), ForeignKey('attendee.id'), nullable=False)
    session_id = Column(Integer(), ForeignKey('session.id'), nullable=False)

    event = relationship('Event', backref='attendee_signups')
    attendee = relationship('Attendee', backref='attendee_signups')
    session = relationship('Session', backref='attendee_signups')

    def __init__(self, event_id, attendee_id, session_id):
        self.event_id = event_id
        self.attendee_id = attendee_id
        self.session_id = session_id
    

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'attendee_id': self.attendee_id,
            'session_id': self.session_id
        }
    
class AttendeeCheckInLog(db.Model):
    __tablename__ = 'attendee_check_in_log'

    id = Column(Integer, primary_key=True)
    attendee_id = Column(Integer(), ForeignKey('attendee.id'), nullable=False)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    checked_in = Column(Boolean, nullable=False, default=False, server_default='false')
    timestamp = Column(DateTime, nullable=True)

    def __init__(self, attendee_id, event_id, checked_in):
        self.attendee_id = attendee_id
        self.event_id = event_id
        self.checked_in = checked_in
        self.timestamp = datetime.now(UTC)
    
    def to_dict(self):
        from common.util import helper
        timestamp = helper.convert_datetime_to_local_timezone(self.timestamp)
        return {
            'id': self.id,
            'attendee_id': self.attendee_id,
            'event_id': self.event_id,
            'checked_in': self.checked_in,
            'timestamp': timestamp.isoformat()
        }
    

class AttendeeMagicLink(db.Model):
    __tablename__ = 'attendee_magic_link'

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    attendee_account_id = Column(Integer(), ForeignKey('attendee_account.id'), nullable=False)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, nullable=False, default=False)

    attendee_account = relationship('AttendeeAccount', backref='magic_links')

    @property
    def url(self):
        from common.configuration import ConfigType, get_config_value
        base_url = get_config_value(ConfigType.APP_URL)
        full_url = f'{base_url}/attendee/login?magic={self.id}'
        return full_url


    def __init__(self, attendee_account_id, event_id, expires_at=None):
        self.attendee_account_id = attendee_account_id
        self.event_id = event_id
        self.created_at = datetime.now(UTC)
        self.used = False

        if not expires_at:
            expires_at = (datetime.now(UTC) + timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
        self.expires_at = expires_at
    
    def to_dict(self):
        from common.util import helper
        created_at = helper.convert_datetime_to_local_timezone(self.created_at)
        expires_at = helper.convert_datetime_to_local_timezone(self.expires_at)
        return {
            'id': self.id,
            'attendee_account_id': self.attendee_account_id,
            'event_id': self.event_id,
            'created_at': created_at,
            'expires_at': expires_at,
            'used': self.used
        }