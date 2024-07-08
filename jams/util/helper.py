from jams.models import db, Event, EventLocation, EventTimeslot, Timeslot, Session


def get_ordered_event_locations(event_id):
    return EventLocation.query.filter_by(event_id=event_id).order_by(EventLocation.order).all()

def get_ordered_event_timeslots(event_id):
    return EventTimeslot.query.join(Timeslot, EventTimeslot.timeslot_id == Timeslot.id).filter(EventTimeslot.event_id == event_id).order_by(Timeslot.start).all() 

def session_exists(location_id, timeslot_id):
    exists = db.session.query(Session.query.filter_by(event_location_id=location_id, event_timeslot_id=timeslot_id).exists()).scalar()
    return exists

def prep_delete_event_location(event_location_id):
    event_location = EventLocation.query.filter_by(id=event_location_id).first()
    event_sessions = event_location.sessions
    for event_session in event_sessions:
        if not prep_delete_session(event_session.id):
            return False
        db.session.delete(event_session)
    
    # TODO: Remove anything else here in future (Not needed at the time of writing)
    db.session.commit()

    # Check if there are no sessions for this event_location
    if event_location.sessions is not None:
        # There are still sessions, so return false
        return False
    
    # Everything is removed, so return true
    return True


def prep_delete_event_Timeslot(event_timeslot_id):
    event_timeslot = EventTimeslot.query.filter_by(id=event_timeslot_id).first()
    event_sessions = event_timeslot.sessions
    for event_session in event_sessions:
        if not prep_delete_session(event_session.id):
            return False
        db.session.delete(event_session)
    
    # TODO: Remove anything else here in future (Not needed at the time of writing)
    db.session.commit()

    # Check if there are no sessions for this event_timeslot
    if event_timeslot.sessions is not None:
        # There are still sessions, so return false
        return False
    
    # Everything is removed, so return true
    return True

def prep_delete_session(session_id):
    session = Session.query.filter_by(id=session_id).first()
    session_workshop = session.session_workshop
    if session_workshop is not None:
        db.session.delete(session_workshop)
        # TODO: Remove anything else here in future (Not needed at the time of writing)
        db.session.commit()
    
    # Check if there are workshops assigned to this session
    if session.session_workshop is not None:
        # There is still a workshop, so return false
        return False
    
    # Everything is removed, so return true
    return True

def prep_delete_role(role):
    # Get all the users for a specified role
    users = role.users

    # Iterate through each user and remove the role from them
    for user in users:
        user.remove_roles(role.id)
    
    # Commit the changes to the DB
    db.session.commit()

    # Check if no users have the role
    if role.users is not None:
        # Users still have the role, so return false
        return False
    
    # Everything is removed, so return true
    return True
    

def reorder_ids(id_list, target_id, new_index):
    if target_id not in id_list:
        return "Target ID not in list"
    
    if new_index < 0 or new_index > len(id_list):
        return "New index is out of range"
    
    current_idex = id_list.index(target_id)

    if current_idex == new_index:
        return id_list

    id_list.pop(current_idex)

    id_list.insert(new_index, target_id)

    return id_list
    
