from . import db
from sqlalchemy  import Boolean, Column, String, Integer

class Config(db.Model):
    __tablename__ = 'config'

    id = Column(Integer, primary_key=True)
    key = Column(String, nullable=False, unique=True)
    value = Column(String, nullable=True)
    private = Column(Boolean, nullable=False)
    
    def __int__(self, key, value, private=True):
        self.key = key
        self.value = value
        self.private = private
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'private': self.private
        }