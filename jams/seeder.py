from jams.models import db, User, Role, Workshop, Event, Location, Timeslot, Session
from flask_security.utils import hash_password
import datetime

def preform_seed():
    seed_roles()
    seed_users()
    seed_workshops()
    seed_events()
    seed_locations()
    seed_timeslots()

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

def seed_events():
    # Check if the Jam event already exists
    if not Event.query.filter_by(name="Jam").first():
        date = datetime.date(day=15, month=9, year=2024)
        event = Event(name="Jam", description="This is a Test event for Jam", date=date, password="jam123")
        db.session.add(event)
    
    # Check if the coder dojo event already exists
    if not Event.query.filter_by(name="Coder Dojo").first():
        date = datetime.date(day=7, month=8, year=2024)
        event = Event(name="Coder Dojo", description="Coder dojo test event", date=date, password="password123")
        db.session.add(event)
    
    db.session.commit()

def seed_locations():
    # Check if the workshop g-2 location already exists
    if not Location.query.filter_by(name="Workshop G-2").first():
        location = Location(name="Workshop G-2")
        db.session.add(location)
    
    # Check if the lecture theatre 1 location already exists
    if not Location.query.filter_by(name="Lecture Theater 1").first():
        location = Location(name="Lecture Theater 1")
        db.session.add(location)
    
    db.session.commit()

def seed_timeslots():
    # Check if the 1-2 timeslot already exists
    if not Timeslot.query.filter_by(name="1-2").first():
        start = datetime.time(hour=13)
        end = datetime.time(hour=14)
        timeslot = Timeslot(name="1-2", start=start, end=end)
        db.session.add(timeslot)
    
    # Check if the 2-3 timeslot already exists
    if not Timeslot.query.filter_by(name="2-3").first():
        start = datetime.time(hour=14)
        end = datetime.time(hour=15)
        timeslot = Timeslot(name="2-3", start=start, end=end)
        db.session.add(timeslot)
    
    db.session.commit()