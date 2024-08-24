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
    current_version_id = Column(String(), nullable=False)
    public = Column(Boolean(), nullable=False, default=False)

    def __init__(self, name, bucket_name, current_version_id, public=False):
        self.name = name
        self.bucket_name = bucket_name
        self.current_version_id = current_version_id
        self.public = public
    
    def to_dict(self):
        return {
            'uuid': self.id,
            'name': self.name,
            'bucket_name': self.bucket_name,
            'current_version_id': self.current_version_id,
            'public': self.public
        }
    
class FileVersion(db.Model):
    __tablename__ = 'file_version'

    id = Column(Integer(), primary_key=True)
    file_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey('file.id'), nullable=False)
    version_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    file = relationship('File', backref='versions')

    def __int__(self, file_id, version_id):
        self.file_id = file_id
        self.version_id = version_id

    def to_dict(self):
        return {
            'file_version_id': self.id,
            'file_id': self.file_id,
            'version_id': self.version_id
        }

    
class WorkshopFile(db.Model):
    __tablename__ = 'workshop_file'

    id = Column(Integer(), primary_key=True)
    workshop_id = Column(Integer(), ForeignKey('workshop.id'), nullable=False)
    file_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey('file.id'), nullable=False)
    type = Column(String(80), nullable=False)

    workshop = relationship('Workshop', backref='files')
    file = relationship('File', backref='workshop_file')

    def __int__(self, workshop_id, file_id, type):
        self.workshop_id = workshop_id
        self.file_id = file_id
        self.type = type
    
    def to_dict(self):
        return {
            'id': self.id,
            'workshop_id': self.workshop_id,
            'file_id': self.file_id,
            'type': self.type
        }

    