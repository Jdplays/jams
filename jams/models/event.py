from . import db
from sqlalchemy  import Column, String, Integer, DATE, TIME, Boolean, ForeignKey
from sqlalchemy.orm import relationship, backref

class Event(db.Model):
    __tablename__ = 'event'
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    description = Column(String(255), unique=False, nullable=True)
    date = Column(DATE, nullable=False)
    start_time = Column(TIME, nullable=False)
    end_time = Column(TIME, nullable=False)
    password = Column(String(50), nullable=False)
    capacity = Column(Integer(), nullable=False)
    active = Column(Boolean(), nullable=False, default=True)

    # Integration Event
    external = Column(Boolean(), nullable=True, default=False)
    external_id = Column(String(), nullable=True)
    external_url = Column(String(), nullable=True)

    def __init__(self, name, description, date, start_time, end_time, capacity, password, active=True, external=False, external_id=None, external_url = None):
        self.name = name
        self.description = description
        self.date = date
        self.start_time = start_time
        self.end_time = end_time
        self.capacity = capacity
        self.password = password
        self.active = active
        self.external = external
        self.external_id = external_id
        self.external_url = external_url

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
            'start_time': str(self.start_time),
            'end_time': str(self.end_time),
            'password': self.password,
            'capacity': self.capacity,
            'active': self.active,
            'external': self.external,
            'external_id': self.external_id,
            'external_url': self.external_url
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
    is_break = Column(Boolean(), nullable=False, default=False, server_default='false')
    active = Column(Boolean(), default=True)

    @property
    def range(self):
        start_formatted = self.start.strftime('%H:%M') if self.start else 'N/A'
        end_formatted = self.end.strftime('%H:%M') if self.end else 'N/A'
        return f"{start_formatted} - {end_formatted}"
    
    def __init__(self, name, start, end, is_break, active=True):
        self.name = name
        self.start = start
        self.end = end
        self.is_break = is_break
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
            'range': self.range,
            'is_break': self.is_break,
            'active': self.active
        }

# The EventLocations are locations that are in a specific event and reference one of the overall locations along with an order it should be in (lower = first)
class EventLocation(db.Model):
    __tablename__ = 'event_location'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    location_id = Column(Integer(), ForeignKey('location.id'), nullable=False)
    order = Column(Integer(), nullable=False, default=0)
    publicly_visible = Column(Boolean(), nullable=False, default=True, server_default='true')

    event = relationship('Event', backref='locations')
    location = relationship('Location')

    def __init__(self, event_id, location_id, order=0, publicly_visible=True):
        self.event_id = event_id
        self.location_id = location_id
        self.order = order
        self.publicly_visible = publicly_visible
    
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
            'publicly_visible': self.publicly_visible
        }

# The EventTimeslots are timeslots that are in a specific event and reference one of the overall timeslots along with an order it should be in (lower = first)
class EventTimeslot(db.Model):
    __tablename__ = 'event_timeslot'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    timeslot_id = Column(Integer(), ForeignKey('timeslot.id'), nullable=False)
    publicly_visible = Column(Boolean(), nullable=False, default=True, server_default='true')

    event = relationship('Event', backref='timeslots')
    timeslot = relationship('Timeslot')

    def __init__(self, event_id, timeslot_id, publicly_visible=True):
        self.event_id = event_id
        self.timeslot_id = timeslot_id
        self.publicly_visible = publicly_visible

    def hide(self):
        self.hidden = True

    def show(self):
        self.hidden = False

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'timeslot_id': self.timeslot_id,
            'publicly_visible': self.publicly_visible
        }


# The Sessions are each block in the grid of an event schedule. It links an event with a location and timeslot and allows a workshop to sit on top.
class Session(db.Model):
    __tablename__ = 'session'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    event_location_id = Column(Integer(), ForeignKey('event_location.id'), nullable=False)
    event_timeslot_id = Column(Integer(), ForeignKey('event_timeslot.id'), nullable=False)
    workshop_id = Column(Integer(), ForeignKey('workshop.id'))
    publicly_visible = Column(Boolean(), nullable=False, default=False, server_default='false')
    active = Column(Boolean(), nullable=False, default=True)

    event = relationship('Event', backref='sessions')
    event_location = relationship('EventLocation', backref='sessions')
    event_timeslot = relationship('EventTimeslot', backref='sessions')
    workshop = relationship('Workshop')

    @property
    def has_workshop(self):
        if not self.workshop:
            return False
        return True
    
    @property
    def location_column_order(self):
        return self.event_location.order

    def __init__(self, event_id, event_location_id, event_timeslot_id, workshop_id=None, publicly_visible=False, active=True):
        self.event_id = event_id
        self.event_location_id = event_location_id
        self.event_timeslot_id = event_timeslot_id
        self.workshop_id = workshop_id
        self.publicly_visible = publicly_visible
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
            'workshop_id': self.workshop_id,
            'has_workshop': self.has_workshop,
            'location_column_order': self.location_column_order,
            'publicly_visible': self.publicly_visible,
            'active': self.active
        }