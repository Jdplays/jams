from . import db
from sqlalchemy  import func, Column, String, Integer, Boolean, ForeignKey, text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from uuid import UUID

class File(db.Model):
    __tablename__ = 'file'

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    name = Column(String(), nullable=False)
    bucket_name = Column(String(), nullable=False)
    public = Column(Boolean(), nullable=False, default=False)

    def __init__(self, name, bucket_name, public=False):
        self.name = name
        self.bucket_name = bucket_name
        self.public = public
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'bucket_name': self.bucket_name,
            'public': self.public
        }
    
class WorkshopFile(db.Model):
    __tablename__ = 'workshop_file'

    id = Column(Integer(), primary_key=True)
    workshop_id = Column(Integer(), ForeignKey('workshop.id'), nullable=False)
    file_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey('file.id'), nullable=False)

    workshop = relationship('Workshop', backref='workshop_file')
    file = relationship('File', backref='workshop_file')

    def __int__(self, workshop_id, file_id):
        self.workshop_id = workshop_id
        self.file_id = file_id

    