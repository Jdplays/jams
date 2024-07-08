from . import db
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

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }

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

    @property
    def full_name(self):
        if self.first_name is None:
            return ""
        if self.last_name is None:
            return ""
        return f"{self.first_name}  {self.last_name}"
    
    @property
    def role_ids(self):
        return [role.id for role in self.roles]
    
    @property
    def display_name(self):
        if not self.first_name:
            return self.username
        return f"{self.first_name} {self.last_name}"
    
    @property
    def main_role(self):
        return self.roles[0].name if self.roles else 'No Role'

    # Requires email, username, password to be passed
    def __init__(self, email, username, password, active=False, first_name=None, last_name=None, dob=None, bio=None, role_ids:list[int]=None, fs_uniquifier=None, last_login_at=None, current_login_at=None, last_login_ip=None, current_login_ip=None, login_count=0):
        self.email = email
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.password = password
        self.active = active
        self.dob = dob
        self.bio = bio
        self.set_roles(role_ids)
        self.fs_uniquifier = fs_uniquifier if not None else str(uuid.uuid4())
        self.last_login_at = last_login_at
        self.current_login_at = current_login_at
        self.last_login_ip = last_login_ip
        self.current_login_ip = current_login_ip
        self.login_count = login_count

    def activate(self):
        self.active = True

    def archive(self):
        self.active = False

    def set_roles(self, role_ids):
        # Remove all previous roles
        for role in self.roles:
            self.roles.remove(role)

        # Get role objects for each role_id
        roles = Role.query.filter(Role.id.in_(role_ids)).all()

        # Set roles for the user
        self.roles.extend(roles)

    def add_roles(self, role_ids):
        # Get the current role id's of the user
        current_role_ids = [role.id for role in self.roles]

        # Iterate through the role_ids to find roles that need to be added
        roles_to_add = []
        for role_id in role_ids:
            if role_id not in current_role_ids:
                roles_to_add.append(role_id)

        # Get role objects for each role_id
        roles = Role.query.filter(Role.id.in_(roles_to_add)).all()

        # Add roles to the user
        self.roles.extend(roles)

    def remove_roles(self, role_ids):
        # Get the current role id's of the user
        current_role_ids = [role.id for role in self.roles]

        # Iterate through the role_ids to find roles that need to be removed
        roles_to_remove = []
        for role_id in role_ids:
            if role_id in current_role_ids:
                roles_to_remove.append(role_id)

        # Get role objects for each role_id
        roles = Role.query.filter(Role.id.in_(roles_to_remove)).all()

        # Remove roles from the user
        for role in roles:
            self.roles.remove(role)

    
    def set_roles_by_name(self, role_names):
        self.set_roles([Role.query.filter_by(name=role_name).first().id for role_name in role_names])
        
    
    def user_has_role(self, role_name):
        return any(role_name == role.name for role in self.roles)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'display_name': self.display_name,
            'last_login': self.last_login_at,
            'role_ids': self.role_ids,
            'dob': self.dob,
            'bio': self.bio,
            'active': self.active
        }