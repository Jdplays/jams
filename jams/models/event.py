from . import db
from sqlalchemy  import Column, String, Integer, DATE, TIME, Boolean, ForeignKey
from sqlalchemy.orm import relationship

class Event(db.Model):
    __tablename__ = 'event'
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    description = Column(String(255), unique=False, nullable=True)
    date = Column(DATE, nullable=False)
    password = Column(String(50), nullable=False)
    active = Column(Boolean(), nullable=False, default=True)

    def __init__(self, name, description, date, password, active=True):
        self.name = name
        self.description = description
        self.date = date
        self.password = password
        self.active = active

    def activate(self):
        self.active = True

    def archive(self):
        self.active = False

class Location(db.Model):
    __tablename__ = 'location'

    id = Column(Integer(), primary_key=True)
    name = Column(String(100), nullable=False)
    active = Column(Boolean(), nullable=False, default=True)

    def __init__(self, name, active=True):
        self.name = name
        self.active = active

    def activate(self):
        self.active = True

    def archive(self):
        self.active = False

class Timeslot(db.Model):
    __tablename__ = 'timeslot'

    id = Column(Integer(), primary_key=True)
    name = Column(String(100), nullable=False)
    start = Column(TIME(), nullable=False)
    end = Column(TIME(), nullable=False)
    active = Column(Boolean(), default=True)

    def __init__(self, name, start, end, active=True):
        self.name = name
        self.start = start
        self.end = end
        self.active = active

    def activate(self):
        self.active = True

    def archive(self):
        self.active = False

class Session(db.Model):
    __tablename__ = 'session'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    location_id = Column(Integer(), ForeignKey('location.id'), nullable=False)
    timeslot_id = Column(Integer(), ForeignKey('timeslot.id'), nullable=False)
    active = Column(Boolean(), nullable=False, default=True)

    event = relationship('Event', backref='sessions')
    location = relationship('Location', backref='sessions')
    timeslot = relationship('Timeslot', backref='sessions')

    def __init__(self, event_id, location_id, timeslot_id, active=True):
        self.event_id = event_id
        self.location_id = location_id
        self.timeslot_id = timeslot_id
        self.active = active