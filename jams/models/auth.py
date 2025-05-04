from . import db
from sqlalchemy  import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from flask_security import UserMixin, RoleMixin
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
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
    display_colour = Column(String(7), nullable=False, default='#828181', server_default='#828181')
    priority = Column(Integer, nullable=False, default=10, server_default='10')
    hidden = Column(Boolean, nullable=False, default=False, server_default='false')
    default = Column(Boolean, nullable=False)

    @property
    def page_ids(self):
        return [role_page.page_id for role_page in self.role_pages]

    # Requires name to be passed
    def __init__(self, name, description=None, display_colour='#828181', priority=10, hidden=False, default=False):
        self.name = name
        self.description = description
        self.display_colour = display_colour
        self.priority = priority
        self.hidden = hidden
        self.default = default

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'page_ids': self.page_ids,
            'display_colour': self.display_colour,
            'priority': self.priority,
            'hidden': self.hidden,
            'default': self.default
        }
    
    def public_info_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'display_colour': self.display_colour
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
    bio = Column(String(1000), nullable=True)
    roles = relationship('Role', secondary='user_roles', backref='users')
    fs_uniquifier = Column(String(255), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    open_id_sub = Column(String(255), unique=True, nullable=True)  # OpenID 'sub' claim
    user_induction = Column(Boolean(), nullable=False, default=False, server_default='false')
    avatar_file_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey('file.id'), nullable=True)

    # Extra
    badge_text = Column(String(100), nullable=True)
    badge_icon = Column(String(100), nullable=True)
    
    # Tracking
    last_login_at = Column(DateTime(), nullable=True)
    current_login_at  = Column(DateTime(), nullable=True)
    last_login_ip = Column(String(50), nullable=True)
    current_login_ip  = Column(String(50), nullable=True)
    login_count = Column(Integer, nullable=True)

    avatar_file = relationship('File', foreign_keys=[avatar_file_id])

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
        if self.badge_text:
            return self.badge_text
        role = Role.query.filter(Role.id.in_(self.role_ids)).order_by(Role.priority.asc()).first()
        return role.name if role else 'No Role'

    # Requires email, username, password to be passed
    def __init__(self, email, username, password, active=False, first_name=None, last_name=None, dob=None, bio=None, roles=None, role_ids:list[int]=None, fs_uniquifier=None, last_login_at=None, current_login_at=None, last_login_ip=None, current_login_ip=None, login_count=0, open_id_sub=None, user_induction=False, avatar_file_id=None):
        self.email = email
        self.username = username
        self.first_name = first_name
        self.last_name = last_name
        self.password = password
        self.active = active
        self.dob = dob
        self.bio = bio
        if roles:
            self.roles = roles
        else:
            self.set_roles(role_ids)
        self.fs_uniquifier = fs_uniquifier if not None else str(uuid.uuid4())
        self.last_login_at = last_login_at
        self.current_login_at = current_login_at
        self.last_login_ip = last_login_ip
        self.current_login_ip = current_login_ip
        self.login_count = login_count
        self.open_id_sub = open_id_sub
        self.user_induction = user_induction
        self.avatar_file_id = avatar_file_id

    def activate(self):
        self.active = True

    def archive(self):
        self.active = False

    def set_roles(self, role_ids):
        if role_ids is not None:
            # Remove all previous roles
            for role in self.roles[:]:
                self.roles.remove(role)

            # Get role objects for each role_id
            roles = Role.query.filter(Role.id.in_(role_ids)).all()

            # Set roles for the user
            self.roles.extend(roles)

    def add_roles(self, role_ids):
        if role_ids is not None:
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
        if role_ids is not None:
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
            for role in roles[:]:
                self.roles.remove(role)

    
    def set_roles_by_name(self, role_names):
        self.set_roles([Role.query.filter_by(name=role_name).first().id for role_name in role_names])
        
    
    def user_has_role(self, role_name):
        return any(role_name == role.name for role in self.roles)
    
    def update_config(self, config_dict):
        from jams.models import UserConfig
        if not self.config:
            config = UserConfig(self.id)
            config.user = self
            db.session.add(config)
            db.session.flush()
        
        for key, value in config_dict.items():
            setattr(self.config, key, value)
        
        db.session.commit()
    
    
    def to_dict(self):
        from jams.util import helper
        last_login_at_date_time = helper.convert_datetime_to_local_timezone(self.current_login_at)
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'display_name': self.display_name,
            'last_login': last_login_at_date_time.isoformat(),
            'role_ids': self.role_ids,
            'dob': self.dob,
            'bio': self.bio,
            'active': self.active,
            'user_induction': self.user_induction,
            'avatar_file_id': self.avatar_file_id,
            'badge_text': self.badge_text,
            'badge_icon': self.badge_icon,
            'config': self.config.to_dict() if self.config else {}
        }
    
    def public_info_dict(self):
        public_role_ids = [r.id for r in self.roles if not r.hidden]
        return {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'display_name': self.display_name,
            'role_ids': public_role_ids,
            'bio': self.bio,
            'avatar_file_id': self.avatar_file_id,
            'badge_text': self.badge_text,
            'badge_icon': self.badge_icon,
            'config': self.config.public_info_dict() if self.config else {}
        }
    
## Role based Auth to pages
class Page(db.Model):
    __tablename__ = 'page'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    endpoint = Column(String(255), unique=True, nullable=True)
    parent_id = Column(Integer, ForeignKey('page.id'), nullable=True)
    default = Column(Boolean, nullable=False, default=False, server_default='false')
    public = Column(Boolean, nullable=False, default=False)

    parent = relationship('Page', remote_side=[id], backref='children')

    def __init__(self, name, endpoint=None, parent_id=None, default=False, public=False):
        self.name = name
        self.endpoint = endpoint
        self.parent_id = parent_id
        self.default = default
        self.public = public

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'endpoint': self.endpoint,
            'parent_id': self.parent,
            'default': self.default,
            'public': self.public
        }



class EndpointRule(db.Model):
    __tablename__ = 'endpoint_rule'

    id = Column(Integer, primary_key=True)
    endpoint_id = Column(Integer, ForeignKey('endpoint.id'), nullable=False)
    allowed_fields = Column(String(255), nullable=True) # This is a comma seperated list of allowed fields for the endpoint
    default = Column(Boolean, nullable=False, default=False, server_default='false')
    public = Column(Boolean, nullable=False, default=False)

    endpoint = relationship('Endpoint', backref='endpoint_rules')

    def __init__(self, endpoint_id, allowed_fields=None, default=False, public=False):
        self.endpoint_id = endpoint_id
        self.allowed_fields = allowed_fields
        self.default = default
        self.public = public

    def to_dict(self):
        return {
            'id': self.id,
            'endpoint_id': self.endpoint_id,
            'allowed_fields': self.allowed_fields if self.allowed_fields is not None else '',
            'default': self.default,
            'public': self.public
        }
    
class RoleEndpointRule(db.Model):
    __tablename__ = 'role_endpoint_rule'

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey('role.id'), nullable=False)
    endpoint_rule_id = Column(Integer, ForeignKey('endpoint_rule.id'), nullable=False)

    role = relationship('Role', backref='role_endpoint_rules')
    endpoint_rule = relationship('EndpointRule', backref='role_endpoint_rules')

    def __init__(self, role_id, endpoint_rule_id):
        self.role_id = role_id
        self.endpoint_rule_id = endpoint_rule_id

    def to_dict(self):
        return {
            'id': self.id,
            'role_id': self.role_id,
            'endpoint_rule_id': self.endpoint_rule_id
        }

class PageEndpointRule(db.Model):
    __tablename__ = 'page_endpoint_rule'

    id = Column(Integer, primary_key=True)
    page_id = Column(Integer, ForeignKey('page.id'), nullable=False)
    endpoint_rule_id = Column(Integer, ForeignKey('endpoint_rule.id'), nullable=False)

    page = relationship('Page', backref='page_endpoint_rules')
    endpoint_rule = relationship('EndpointRule', backref='page_endpoint_rules')

    def __init__(self, page_id, endpoint_rule_id):
        self.page_id = page_id
        self.endpoint_rule_id = endpoint_rule_id

    def to_dict(self):
        return {
            'id': self.id,
            'page_id': self.page_id,
            'endpoint_rule_id': self.endpoint_rule_id
        }
        
class RolePage(db.Model):
    __tablename__ = 'role_page'

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey('role.id'), nullable=False)
    page_id = Column(Integer, ForeignKey('page.id'), nullable=False)
    default = Column(Boolean, nullable=False)

    role = relationship('Role', backref='role_pages')
    page = relationship('Page', backref='role_pages')

    def __init__(self, role_id, page_id, default=False):
        self.role_id = role_id
        self.page_id = page_id
        self.default = default

    def to_dict(self):
        return {
            'id': self.id,
            'role_id': self.role_id,
            'page_id': self.page_id
        }