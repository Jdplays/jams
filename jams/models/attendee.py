from . import db
from sqlalchemy  import Boolean, Column, ForeignKey, String, Integer
from sqlalchemy.orm import relationship


class Attendee(db.Model):
    __tablename__ = 'attendee'

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    name = Column(String(255), nullable=False)
    external_id = Column(String, nullable=True, unique=True)
    email = Column(String(255), nullable=True)
    checked_in = Column(Boolean, nullable=False, default=False, server_default='false')
    registerable = Column(Boolean, nullable=False, default=True, server_default='true')
    age = Column(Integer)
    gender = Column(String(50))
    external_order_id = Column(String, nullable=True)
    source = Column(String(100), nullable=False, default='LOCAL', server_default='LOCAL')

    event = relationship('Event', backref='attendees')

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
            'source': self.source
        }