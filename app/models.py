from .extensions import db, login_manager
from flask_security import UserMixin, RoleMixin
from werkzeug.security import generate_password_hash, check_password_hash

# Define the UserRoles association table
class UserRoles(db.Model):
    __tablename__ = 'user_roles'
    id = db.Column(db.Integer(), primary_key=True)
    user_id = db.Column(db.Integer(), db.ForeignKey('user.id', ondelete='CASCADE'))
    role_id = db.Column(db.Integer(), db.ForeignKey('role.id', ondelete='CASCADE'))

class Role(db.Model, RoleMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(255))

    def __init__(self, name):
        self.name = name

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    #email = db.Column(db.String(100), unique=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    roles = db.relationship('Role', secondary='user_roles')
    fs_uniquifier = db.Column(db.String(64), unique=True, nullable=False)

    def __init__(self, username, role_names:list[str]=None):
        self.username = username
        self.set_roles(role_names)

    def __init__(self, username, password, role_names:list[str]):
        self.username = username
        self.password_hash = self.set_password(password)
        self.set_roles(role_names)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def set_roles(self, role_names):
        roles = []
        for role_name in role_names:
            role = Role.query.filter_by(name=role_name).first()
            if role is not None:
                roles.append(role)

        self.roles = roles
    
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)