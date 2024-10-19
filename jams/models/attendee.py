from . import db
from sqlalchemy  import Boolean, Column, ForeignKey, String, Integer, UniqueConstraint
from sqlalchemy.orm import relationship


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
    source = Column(String(100), nullable=False, default='LOCAL', server_default='LOCAL')
    attendee_account_id = Column(Integer(), ForeignKey('attendee_account.id'), nullable=True)

    event = relationship('Event', backref='attendees')
    attendee_account = relationship('AttendeeAccount', backref='attendees')

    def __init__(self, event_id, name, external_id=None, email=None, checked_in=False, registerable=True, age=None, gender=None, external_order_id=None, source='LOCAL'):
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
    
    def link_to_account(self):
        # Link attendee to attendee account
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
            'attendee_account_id': self.attendee_account_id
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

