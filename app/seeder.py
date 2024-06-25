from .models import User, Role, db

def seed_roles():
    roles = ['Attendee', 'Volunteer', 'Trustee', 'Admin']
    for role_name in roles:
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            new_role = Role(name=role_name)
            db.session.add(new_role)
    
    db.session.commit()

def seed_users():
    # Check if the Admin user already exists
    if not User.query.filter_by(username="admin").first():
        admin_role = Role.query.filter_by(name="Admin").first()
        if admin_role:
            user = User(username='admin', role_names=['Admin'])
            user.set_password('admin')
            db.session.add(user)
    
    # Check if the Volunteer user already exists
    if not User.query.filter_by(username="volunteer").first():
        volunteer_role = Role.query.filter_by(name="Volunteer").first()
        if volunteer_role:
            user = User(username='volunteer', role_names=['volunteer'])
            user.set_password('password123')
            db.session.add(user)
    
    db.session.commit()