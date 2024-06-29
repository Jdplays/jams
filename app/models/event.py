from . import db
from sqlalchemy  import Column, String, Integer, DATE

class Event(db.Model):
    __tablename__ = 'event'
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    description = Column(String(255), unique=False, nullable=True)
    date = Column(DATE, nullable=False)
    password = Column(String(50), nullable=False)

    def __init__(self, name, description, date, password):
        self.name = name
        self.description = description
        self.date = date
        self.password = password

