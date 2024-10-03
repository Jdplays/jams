from . import db
from sqlalchemy  import Boolean, Column, ForeignKey, String, Integer


class Attendee(db.Model):
    __tablename__ = 'attendee'

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    name = Column(String(255), nullable=False)
    external_id = Column(String, nullable=True, unique=True)
    email = Column(String(255), nullable=True)
    checked_in = Column(Boolean, nullable=False, default=False, server_default='false')
    registerable = Column(Boolean, nullable=False, default=True, server_default='true')
    external_order_id = Column(String, nullable=True)

    def __init__(self, event_id, name, external_id=None, email=None, checked_in=False, registerable=True, external_order_id=None):
        self.event_id = event_id
        self.name = name
        self.external_id = external_id
        self.email = email
        self.checked_in = checked_in
        self.registerable = registerable
        self.external_order_id = external_order_id
    
    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'name': self.name,
            'external_id': self.external_id,
            'email': self.email,
            'checked_in': self.checked_in,
            'registerable': self.registerable,
            'external_order_id': self.external_order_id
        }