from .extensions import db, login_manager
from sqlalchemy  import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship, backref
from flask_security import UserMixin, RoleMixin
import uuid

# Define the UserRoles association table
class UserRoles(db.Model):
    __tablename__ = 'user_roles'
    id = Column(Integer(), primary_key=True)
    user_id = Column(Integer(), ForeignKey('user.id'))
    role_id = Column(Integer(), ForeignKey('role.id'))

class Role(db.Model, RoleMixin):
    __tablename__ = 'role'
    id = Column(Integer, primary_key=True)
    name = Column(String(80), nullable=False)
    description = Column(String(255))

    def __init__(self, name):
        self.name = name

class User(UserMixin, db.Model):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True)
    username = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    last_login = Column(DateTime())
    active = Column(Boolean())
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    dob = Column(DateTime())
    bio = Column(String(255), nullable=True)
    roles = relationship('Role', secondary='user_roles', backref=backref("users", lazy="dynamic"))
    fs_uniquifier = Column(String(255), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    def __init__(self, email, username, password, active=False, roles:list[str]=None, fs_uniquifier=lambda: str(uuid.uuid4())):
        self.email = email
        self.username = username
        self.password = password
        self.active = active
        self.set_roles(roles)

    def __init__(self, email, username, password, first_name, last_name, active=False, roles:list[str]=None, fs_uniquifier=lambda: str(uuid.uuid4())):
        self.email = email
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.password = password
        self.active = active
        self.set_roles(roles)

    def enable(self):
        self.active = True

    def disable(self):
        self.active = False
    
    def set_roles(self, role_names):
        roles = []
        for role_name in role_names:
            role = Role.query.filter_by(name=role_name).first()
            if role is not None:
                roles.append(role)

        self.roles = roles

    def get_display_name(self):
        if not self.first_name:
            return self.username
        return f"{self.first_name} {self.last_name}"


class Event(db.Model):
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    description = Column(String(255), unique=False, nullable=True)