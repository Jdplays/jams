from jams.models import db, User, Role, Workshop, Event, Location, Timeslot, DifficultyLevel, WorkshopType
from jams.rbac import generate_full_rbac
from jams.configuration import ConfigType, set_config_value
from flask_security.utils import hash_password
import datetime

def preform_seed():
    generate_full_rbac()
    seed_users()
    seed_difficulty_levels()
    seed_workshop_types()
    seed_workshops()
    seed_events()
    seed_locations()
    seed_timeslots()
    seed_config()

def seed_users():
    # Check if the Admin user already exists
    if not User.query.filter_by(email="admin@test.com").first():
        admin_role = Role.query.filter_by(name="Admin").first()
        if admin_role:
            user = User(email='admin@test.com', username="AdminAccount", password=hash_password('admin'), user_induction=True)
            user.set_roles_by_name(['Admin', 'Volunteer'])
            user.activate()
            db.session.add(user)
    db.session.commit()

def seed_difficulty_levels():
    if not DifficultyLevel.query.filter_by(name="Beginner").first():
        level = DifficultyLevel('Beginner', "#8cff57")
        db.session.add(level)

    if not DifficultyLevel.query.filter_by(name="Intermediate").first():
        level = DifficultyLevel('Intermediate', "#f9ff28")
        db.session.add(level)

    if not DifficultyLevel.query.filter_by(name="Advanced").first():
        level = DifficultyLevel('Advanced', "#ff3232")
        db.session.add(level)
    
    db.session.commit()

def seed_workshop_types():
    if not WorkshopType.query.filter_by(name='Standard Workshop').first():
        workshop_type = WorkshopType(
            name='Standard Workshop',
            description='A normal workshop which both volunteers and attendees can register for and is publicly visible.',
            )
        db.session.add(workshop_type)

    if not WorkshopType.query.filter_by(name='Internal Volunteer Workshop').first():
        workshop_type = WorkshopType(
            name='Internal Volunteer Workshop',
            description='A workshop that is not publicly visible and only volunteers can sign up to.',
            attendee_registration=False,
            publicly_visible=False,
            display_colour='#551ca6'
            )
        db.session.add(workshop_type)

    if not WorkshopType.query.filter_by(name='Attendee Only Workshop').first():
        workshop_type = WorkshopType(
            name='Attendee Only Workshop',
            description='A workshop that only attendees can signup to. This is also publicly visible',
            volunteer_signup=False
            )
        db.session.add(workshop_type)

    if not WorkshopType.query.filter_by(name='Attendee Information Session').first():
        workshop_type = WorkshopType(
            name='Attendee Information Session',
            description='An session that is public, but no one can sign up to. EG: (Break time)',
            volunteer_signup=False,
            attendee_registration=False,
            display_colour='#ffb412'
            )
        db.session.add(workshop_type)

    if not WorkshopType.query.filter_by(name='Volunteer Information Session').first():
        workshop_type = WorkshopType(
            name='Volunteer Information Session',
            description='An session that is private and for the volunteers, but no one can sign up to. EG: (Debrief)',
            volunteer_signup=False,
            attendee_registration=False,
            publicly_visible=False,
            display_colour='#696564'
            )
        db.session.add(workshop_type)
    
    db.session.commit()

def seed_workshops():
    # Check if the AstroPi workshop already exists
    if not Workshop.query.filter_by(name="AstroPi").first():
        workshop = Workshop(name="AstroPi", description="Find out how to run your very own code in space with the European Astro Pi Challenge.")
        workshop.set_difficulty_by_name('Beginner')
        workshop.set_workshop_type_by_name('Standard Workshop')
        db.session.add(workshop)
    
    # Check if the Zigbee workshop already exists
    if not Workshop.query.filter_by(name="Zigbee").first():
        workshop = Workshop(name="Zigbee", description="Using Zigbee (A wireless communication protocol) you can control all sorts of tech! This workshop shows how to control RGB lamps using Python")
        workshop.set_difficulty_by_name('Intermediate')
        workshop.set_workshop_type_by_name('Standard Workshop')
        db.session.add(workshop)
    
    db.session.commit()

def seed_events():
    # Check if the Jam event already exists
    if not Event.query.filter_by(name="Jam").first():
        date = datetime.date(day=15, month=9, year=2024)
        start = datetime.time(hour=13, minute=0, second=0)
        end = datetime.time(hour=17, minute=0, second=0)
        capacity = 50
        event = Event(name="Jam", description="This is a Test event for Jam", date=date, start_time=start, end_time=end, capacity=capacity, password="jam123")
        db.session.add(event)
    
    # Check if the coder dojo event already exists
    if not Event.query.filter_by(name="Coder Dojo").first():
        date = datetime.date(day=7, month=8, year=2024)
        start = datetime.time(hour=18, minute=0, second=0)
        end = datetime.time(hour=20, minute=0, second=0)
        capacity = 50
        event = Event(name="Coder Dojo", description="Coder dojo test event", date=date, start_time=start, end_time=end, capacity=capacity, password="password123")
        db.session.add(event)
    
    db.session.commit()

def seed_locations():

    # Check if the Workshop G-1 location already exists
    if not Location.query.filter_by(name="Workshop G-1").first():
        location = Location(name="Workshop G-1")
        db.session.add(location)

    # Check if the workshop g-2 location already exists
    if not Location.query.filter_by(name="Workshop G-2").first():
        location = Location(name="Workshop G-2")
        db.session.add(location)
    
    # Check if the lecture theatre 1 location already exists
    if not Location.query.filter_by(name="Lecture Theater 1").first():
        location = Location(name="Lecture Theater 1")
        db.session.add(location)

    # Check if the Workshop 1-1 location already exists
    if not Location.query.filter_by(name="Workshop 1-1").first():
        location = Location(name="Workshop 1-1")
        db.session.add(location)
    
    db.session.commit()

def seed_timeslots():
    # Check if the Session 1 timeslot already exists
    if not Timeslot.query.filter_by(name="Session 1").first():
        start = datetime.time(hour=13)
        end = datetime.time(hour=14)
        timeslot = Timeslot(name="Session 1", start=start, end=end)
        db.session.add(timeslot)
    
    # Check if the Session 2 timeslot already exists
    if not Timeslot.query.filter_by(name="Session 2").first():
        start = datetime.time(hour=14)
        end = datetime.time(hour=15)
        timeslot = Timeslot(name="Session 2", start=start, end=end)
        db.session.add(timeslot)

     # Check if the Session 3 timeslot already exists
    if not Timeslot.query.filter_by(name="Session 3").first():
        start = datetime.time(hour=15)
        end = datetime.time(hour=16)
        timeslot = Timeslot(name="Session 3", start=start, end=end)
        db.session.add(timeslot)
    
    db.session.commit()

def seed_config():
    set_config_value(ConfigType.LOCAL_AUTH_ENABLED, True)