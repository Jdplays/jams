from .extensions import db
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
    description = Column(String(255), nullable=True)

    # Requires name to be passed
    def __init__(self, name, description=None):
        self.name = name
        self.description = description

class User(UserMixin, db.Model):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    active = Column(Boolean(), nullable=False)
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    dob = Column(DateTime(), nullable=True)
    bio = Column(String(255), nullable=True)
    roles = relationship('Role', secondary='user_roles', backref=backref("users", lazy="dynamic"))
    fs_uniquifier = Column(String(255), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    
    # Tracking
    last_login_at = Column(DateTime(), nullable=True)
    current_login_at  = Column(DateTime(), nullable=True)
    last_login_ip = Column(String(50), nullable=True)
    current_login_ip  = Column(String(50), nullable=True)
    login_count = Column(Integer, nullable=True)

    # Requires email, username, password to be passed
    def __init__(self, email, username, password, active=False, first_name=None, last_name=None, dob=None, bio=None, roles:list[str]=None, fs_uniquifier=None, last_login_at=None, current_login_at=None, last_login_ip=None, current_login_ip=None, login_count=0):
        self.email = email
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.password = password
        self.active = active
        self.dob = dob
        self.bio = bio
        self.set_roles(roles)
        self.fs_uniquifier = fs_uniquifier if not None else str(uuid.uuid4())
        self.last_login_at = last_login_at
        self.current_login_at = current_login_at
        self.last_login_ip = last_login_ip
        self.current_login_ip = current_login_ip
        self.login_count = login_count

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
    
    def get_main_role(self):
        return self.roles[0].name if self.roles else 'No Role'
    
    def user_has_role(self, role_name):
        return any(role_name == role.name for role in self.roles)
    
    def get_role_names(self):
        return [role.name for role in self.roles]
    
    def get_full_name(self):
        if self.first_name is None:
            return ""
        if self.last_name is None:
            return ""
        return f"{self.first_name}  {self.last_name}"


class Event(db.Model):
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    description = Column(String(255), unique=False, nullable=True)

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