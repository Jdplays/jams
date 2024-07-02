from . import db
from sqlalchemy  import Column, String, Integer, Boolean, DATE

class Workshop(db.Model):
    __tablename__ = 'workshop'

    id = Column(Integer(), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    min_volunteers = Column(Integer(), nullable=False, default=0)
    active = Column(Boolean(), nullable=False, default=True)

    # Requires name and description to be passed
    def __init__(self, name, description, min_volunteers=0, active=True):
        self.name = name
        self.description = description
        self.min_volunteers = min_volunteers
        self.active = active

    def archive(self):
        self.active = False

    def activate(self):
        self.active = True