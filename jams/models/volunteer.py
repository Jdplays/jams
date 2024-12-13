from . import db
from sqlalchemy  import Column, DateTime, String, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, UTC

class VolunteerAttendance (db.Model):
    __tablename__ = 'volunteer_attendance'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    user_id = Column(Integer(), ForeignKey('user.id'), nullable=False)
    setup = Column(Boolean(), nullable=True)
    main = Column(Boolean(), nullable=True)
    packdown = Column(Boolean(), nullable=True)
    note = Column(String(255), nullable=True)
    timestamp = Column(DateTime, nullable=True)

    event = relationship('Event', backref='volunteer_attendances')
    user = relationship('User', backref='volunteer_attendances')

    def __init__(self, event_id, user_id, setup=None, main=None, packdown=None, note=None):
        self.event_id = event_id
        self.user_id = user_id
        self.setup = setup
        self.main = main
        self.packdown = packdown
        self.note = note
        self.timestamp = datetime.now(UTC)

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'user_id': self.user_id,
            'setup': self.setup,
            'main': self.main,
            'packdown': self.packdown,
            'note': self.note,
            'timestamp': self.timestamp
        }

class VolunteerSignup (db.Model):
    __tablename__ = 'volunteer_signup'

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    user_id = Column(Integer(), ForeignKey('user.id'), nullable=False)
    session_id = Column(Integer(), ForeignKey('session.id'), nullable=False)

    __table_args__ = (
        UniqueConstraint('event_id', 'user_id', 'session_id', name='unique_relationship'),
    )

    event = relationship('Event', backref='volunteer_signups')
    user = relationship('User', backref='volunteer_signups')
    session = relationship('Session', backref='volunteer_signups')

    def __init__(self, event_id, user_id, session_id):
        self.event_id = event_id
        self.user_id = user_id
        self.session_id = session_id

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'user_id': self.user_id,
            'session_id': self.session_id
        }

class AttendanceStreak(db.Model):
    __tablename__ = 'attendance_streak'

    id = Column(Integer(), primary_key=True)
    user_id = Column(Integer(), ForeignKey('user.id'), nullable=False)
    streak = Column(Integer(), nullable=False, default=0)
    longest_streak = Column(Integer(), nullable=False, default=0)
    freezes = Column(Integer(), nullable=False, default=2)
    total_attended = Column(Integer(), nullable=False, default=0)

    user = relationship('User', backref='attendance_streak')

    def __init__(self, user_id):
        self.user_id = user_id
        self.streak = 0
        self.longest_streak = 0
        self.freezes = 2
        self.total_attended = 0
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'streak': self.streak,
            'longest_streak': self.longest_streak,
            'freezes': self.freezes,
            'total_attended': self.total_attended
        }