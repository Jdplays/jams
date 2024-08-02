from . import db
from sqlalchemy  import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship


class Workshop(db.Model):
    __tablename__ = 'workshop'

    id = Column(Integer(), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    min_volunteers = Column(Integer(), nullable=False, default=0)
    difficulty_id = Column(Integer(), ForeignKey('difficulty_level.id'), nullable=True)
    active = Column(Boolean(), nullable=False, default=True)

    difficulty = relationship('DifficultyLevel', backref='workshops')

    # Requires name and description to be passed
    def __init__(self, name, description, min_volunteers=0, difficulty_id=None, active=True):
        self.name = name
        self.description = description
        self.min_volunteers = min_volunteers
        self.difficulty_id = difficulty_id
        self.active = active

    def set_difficulty(self, difficulty_id):
        self.difficulty_id = difficulty_id

    def set_difficulty_by_name(self, difficulty_name):
        if difficulty_name is not None:
            difficulty = DifficultyLevel.query.filter_by(name=difficulty_name).first()

            if difficulty is not None:
                self.set_difficulty(difficulty.id)

    def archive(self):
        self.active = False

    def activate(self):
        self.active = True

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'min_volunteers': self.min_volunteers,
            'difficulty_id': self.difficulty_id,
            'active': self.active
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