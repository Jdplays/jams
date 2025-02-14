from . import db
from sqlalchemy  import Column, String, Integer, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship

class WorkshopType(db.Model):
    __tablename__ = 'workshop_type'
    id = Column(Integer(), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    volunteer_signup = Column(Boolean, nullable=False, default=True, server_default='true')
    attendee_registration = Column(Boolean, nullable=False, default=True, server_default='true')
    publicly_visible = Column(Boolean, nullable=False, default=True, server_default='true')
    display_colour = Column(String(7), nullable=True)

    def __init__(self, name, description, volunteer_signup=True, attendee_registration=True, publicly_visible=True, display_colour=None):
        self.name = name
        self.description = description
        self.volunteer_signup = volunteer_signup
        self.attendee_registration = attendee_registration
        self.publicly_visible = publicly_visible
        self.display_colour = display_colour

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'volunteer_signup': self.volunteer_signup,
            'attendee_registration': self.attendee_registration,
            'publicly_visible': self.publicly_visible,
            'display_colour': self.display_colour
        }

class Workshop(db.Model):
    __tablename__ = 'workshop'

    id = Column(Integer(), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    difficulty_id = Column(Integer(), ForeignKey('difficulty_level.id'), nullable=True)
    active = Column(Boolean(), nullable=False, default=True)

    # Permissions
    workshop_type_id = Column(Integer(), ForeignKey('workshop_type.id'), nullable=False, server_default='1')
    volunteer_signup = Column(Boolean, nullable=False, default=True, server_default='true')
    attendee_registration = Column(Boolean, nullable=False, default=True, server_default='true')
    publicly_visible = Column(Boolean, nullable=False, default=True, server_default='true')
    min_volunteers = Column(Integer(), nullable=True)
    capacity = Column(Integer(), nullable=True)
    overflow = Column(Boolean, nullable=False, default=False, server_default='false')

    difficulty = relationship('DifficultyLevel', backref='workshops')
    workshop_type = relationship('WorkshopType', backref='workshops')

    @property
    def has_files(self):
        if not self.files:
            return False
        return True

    # Requires name and description to be passed
    def __init__(self, name, description, difficulty_id=None, active=True, volunteer_signup=True, attendee_registration=True, publicly_visible=True, min_volunteers=0, capacity=0, overflow=False, workshop_type_id=None):
        self.name = name
        self.description = description
        self.difficulty_id = difficulty_id
        self.active = active
        self.volunteer_signup = volunteer_signup
        self.attendee_registration = attendee_registration
        self.publicly_visible = publicly_visible
        self.min_volunteers = min_volunteers
        self.capacity = capacity
        self.overflow = overflow
        
        if not workshop_type_id:
            workshop_type = WorkshopType.query.filter_by(name='Standard Workshop').first()
            if workshop_type is not None:
                self.workshop_type_id = workshop_type.id
        else:
            self.workshop_type_id = workshop_type_id
        
        self.update_workshop_permissions()

        

    def set_difficulty(self, difficulty_id):
        self.difficulty_id = difficulty_id

    def set_difficulty_by_name(self, difficulty_name):
        if difficulty_name is not None:
            difficulty = DifficultyLevel.query.filter_by(name=difficulty_name).first()

            if difficulty is not None:
                self.set_difficulty(difficulty.id)
    
    def set_workshop_type_by_name(self, workshop_type_name):
        if workshop_type_name is not None:
            workshop_type = WorkshopType.query.filter_by(name=workshop_type_name).first()

            if workshop_type is not None:
                self.workshop_type_id = workshop_type.id

    def archive(self):
        self.active = False

    def activate(self):
        self.active = True

    def update_workshop_permissions(self):
        workshop_type = WorkshopType.query.filter_by(id=self.workshop_type_id).first()

        self.volunteer_signup = workshop_type.volunteer_signup
        self.attendee_registration = workshop_type.attendee_registration
        self.publicly_visible = workshop_type.publicly_visible

        if not self.volunteer_signup:
            self.min_volunteers = None
        
        if not self.attendee_registration:
            self.capacity = None
            self.difficulty_id = None
            self.overflow = False

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'difficulty_id': self.difficulty_id,
            'has_files': self.has_files,
            'active': self.active,
            'workshop_type_id': self.workshop_type_id,
            'volunteer_signup': self.volunteer_signup,
            'attendee_registration': self.attendee_registration,
            'publicly_visible': self.publicly_visible,
            'min_volunteers': self.min_volunteers,
            'capacity': self.capacity,
            'overflow': self.overflow
        }
    
class DifficultyLevel(db.Model):
    __tablename__ = 'difficulty_level'

    id = Column(Integer(), primary_key=True)
    name = Column(String(50), nullable=False)
    display_colour = Column(String(7), nullable=False)

    def __init__(self, name, colour):
        self.name = name
        self.display_colour = colour

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'display_colour': self.display_colour
        }