from . import db
from sqlalchemy  import Column, String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

class PrivateAccessLog(db.Model):
    __tablename__ = 'private_access_log'

    id = Column(Integer, primary_key=True)
    url = Column(String(), nullable=False)
    internal_endpoint = Column(String(), nullable=False)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    user_role_names = Column(String(), nullable=False)
    required_role_names = Column(String(), nullable=False)
    status_code = Column(String(), nullable=False)
    date_time = Column(DateTime, server_default=func.now(), nullable=False)

    user = relationship('User')

    @property
    def user_display_name(self):
        return self.user.display_name
    
    @property
    def username(self):
        return self.user.username
    
    @property
    def user_email(self):
        return self.user.email
    
    def __int__(self, url, internal_endpoint, user_id, user_role_names, required_role_names, status_code):
        self.url = url
        self.internal_endpoint = internal_endpoint
        self.user_id = user_id
        self.user_role_names = user_role_names
        self.required_role_names = required_role_names
        self.status_code = status_code

    @staticmethod
    def size():
        from jams.util import helper
        return helper.get_table_size(PrivateAccessLog.__tablename__)

    
    def to_dict(self):
        from jams.util import helper
        date_time = helper.convert_datetime_to_local_timezone(self.date_time)
        return {
            'id': self.id,
            'url': self.url,
            'internal_endpoint': self.internal_endpoint,
            'user_id': self.user_id,
            'user_display_name': self.user_display_name,
            'username': self.username,
            'user_email': self.user_email,
            'user_role_names': self.user_role_names,
            'required_role_names': self.required_role_names,
            'status_code': self.status_code,
            'date_time': date_time.isoformat()
        }