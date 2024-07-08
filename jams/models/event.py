from . import db
from sqlalchemy  import Column, String, Integer, DATE, TIME, Boolean, ForeignKey
from sqlalchemy.orm import relationship, backref

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

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'date': str(self.date),
            'password': self.password,
            'active': self.active
        }


# The overall locations that can be used across multiple events
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

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'active': self.active
        }

# The overall timeslots that can be used across multiple events
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

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'start': str(self.start),
            'end': str(self.end),
            'active': self.active
        }

# The EventLocations are locations that are in a specific event and reference one of the overall locations along with an order it should be in (lower = first)
class EventLocation(db.Model):
    __tablename__ = 'event_location'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    location_id = Column(Integer(), ForeignKey('location.id'), nullable=False)
    order = Column(Integer(), nullable=False, default=0)
    hidden = Column(Boolean(), nullable=False, default=False)

    event = relationship('Event', backref='locations')
    location = relationship('Location')

    def __init__(self, event_id, location_id, order=0, hidden=False):
        self.event_id = event_id
        self.location_id = location_id
        self.order = order
        self.hidden = hidden
    
    def hide(self):
        self.hidden = True

    def show(self):
        self.hidden = False

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'location_id': self.location_id,
            'order': self.order,
            'hidden': self.hidden
        }

# The EventTimeslots are timeslots that are in a specific event and reference one of the overall timeslots along with an order it should be in (lower = first)
class EventTimeslot(db.Model):
    __tablename__ = 'event_timeslot'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    timeslot_id = Column(Integer(), ForeignKey('timeslot.id'), nullable=False)
    hidden = Column(Boolean(), nullable=False, default=False)

    event = relationship('Event', backref='timeslots')
    timeslot = relationship('Timeslot')

    def __init__(self, event_id, timeslot_id, hidden=False):
        self.event_id = event_id
        self.timeslot_id = timeslot_id
        self.hidden = hidden

    def hide(self):
        self.hidden = True

    def show(self):
        self.hidden = False

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'timeslot_id': self.timeslot_id,
            'hidden': self.hidden
        }


# The Sessions are each block in the grid of an event schedule. It links an event with a location and timeslot and allows a workshop to sit on top.
class Session(db.Model):
    __tablename__ = 'session'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    event_location_id = Column(Integer(), ForeignKey('event_location.id'), nullable=False)
    event_timeslot_id = Column(Integer(), ForeignKey('event_timeslot.id'), nullable=False)
    active = Column(Boolean(), nullable=False, default=True)

    event = relationship('Event', backref='sessions')
    event_location = relationship('EventLocation', backref='sessions')
    event_timeslot = relationship('EventTimeslot', backref='sessions')

    def __init__(self, event_id, event_location_id, event_timeslot_id, active=True):
        self.event_id = event_id
        self.event_location_id = event_location_id
        self.event_timeslot_id = event_timeslot_id
        self.active = active

    def activate(self):
        self.active = True

    def archive(self):
        self.active = False

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'event_location_id': self.event_location_id,
            'event_timeslot_id': self.event_timeslot_id,
            'active': self.active
        }



class SessionWorkshop(db.Model):
    __tablename__ = 'session_workshop'

    id = Column(Integer(), primary_key=True)
    session_id = Column(Integer(), ForeignKey('session.id'), nullable=False)
    workshop_id = Column(Integer(), ForeignKey('workshop.id'), nullable=False)

    session = relationship('Session', backref=backref('session_workshop', uselist=False))
    workshop = relationship('Workshop')

    def __init__(self, session_id, workshop_id):
        self.session_id = session_id
        self.workshop_id = workshop_id

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'workshop_id': self.workshop_id
        }