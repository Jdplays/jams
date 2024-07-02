from .models import User, Role, Workshop, db
from flask_security.utils import hash_password

def preform_seed():
    seed_roles()
    seed_users()
    seed_workshops()

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
    if not User.query.filter_by(email="admin@test.com").first():
        admin_role = Role.query.filter_by(name="Admin").first()
        if admin_role:
            user = User(email='admin@test.com', username="AdminAccount", password=hash_password('admin'), roles=['Admin', 'Volunteer', 'Trustee'])
            user.activate()
            db.session.add(user)
    
    # Check if the Volunteer user already exists
    if not User.query.filter_by(email="volunteer@test.com").first():
        volunteer_role = Role.query.filter_by(name="Volunteer").first()
        if volunteer_role:
            user = User(email='volunteer@test.com', username="VolunteerAccount", password=hash_password('password123'), roles=['Volunteer'])
            user.activate()
            db.session.add(user)
    
    db.session.commit()

def seed_workshops():
    # Check if the AstroPi workshop already exists
    if not Workshop.query.filter_by(name="AstroPi").first():
        workshop = Workshop(name="AstroPi", description="Find out how to run your very own code in space with the European Astro Pi Challenge.")
        db.session.add(workshop)
    
    # Check if the Zigbee workshop already exists
    if not Workshop.query.filter_by(name="Zigbee").first():
        workshop = Workshop(name="Zigbee", description="Using Zigbee (A wireless communication protocol) you can control all sorts of tech! This workshop shows how to control RGB lamps using Python")
        db.session.add(workshop)
    
    db.session.commit()