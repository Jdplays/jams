from .extensions import db, login_manager
from sqlalchemy  import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship, backref
from flask_security import UserMixin, RoleMixin, hash_password
from werkzeug.security import generate_password_hash, check_password_hash
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
    username = Column(String(255), unique=True, nullable=True)
    password = Column(String(255), nullable=False)
    last_login = Column(DateTime())
    active = Column(Boolean())
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    roles = relationship('Role', secondary='user_roles', backref=backref("users", lazy="dynamic"))
    fs_uniquifier = Column(String(255), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    def __init__(self, email, password, role_names:list[str]=None):
        self.email = email
        self.password = hash_password(password)
        self.set_roles(role_names)

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


class Event(db.Model):
    id = Column(Integer, primary_key=True)
    name = Column(String(80), unique=True, nullable=False)
    description = Column(String(255), unique=False, nullable=True)