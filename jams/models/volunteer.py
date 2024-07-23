from . import db
from sqlalchemy  import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship

class VolunteerAttendance (db.Model):
    __tablename__ = 'volunteer_attendance '

    id = Column(Integer(), primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    user_id = Column(Integer(), ForeignKey('user.id'), nullable=False)
    setup = Column(Boolean(), nullable=True)
    main = Column(Boolean(), nullable=True)
    packdown = Column(Boolean(), nullable=True)
    note = Column(String(255), nullable=True)

    event = relationship('Event', backref='volunteer_attendances')
    user = relationship('User', backref='volunteer_attendances')

    def __init__(self, event_id, user_id, setup=None, main=None, packdown=None, note=None):
        self.event_id = event_id
        self.user_id = user_id
        self.setup = setup
        self.main = main
        self.packdown = packdown
        self.note = note

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'user_id': self.user_id,
            'setup': self.setup,
            'main': self.main,
            'packdown': self.packdown,
            'note': self.note
        }