from flask import request
from jams.models import db, Event, Session, VolunteerSignup
from jams.util import helper, task_scheduler

def create_event(name, description, date, start_date_time, end_date_time, capacity, password, active=True, external=False, external_id=None, external_url = None):
    event = Event(
        name=name,
        description=description,
        date=date,
        start_date_time=start_date_time,
        end_date_time=end_date_time,
        capacity=capacity, password=password,
        active=active, external=external,
        external_id=external_id,
        external_url=external_url
    )

    db.session.add(event)
    db.session.commit()

    task_scheduler.create_event_tasks(event)

    return event

def fetch_event_sessions(event_id):
    # Check if the event exists
    Event.query.filter_by(id=event_id).first_or_404()
    sessions = Session.query.filter_by(event_id=event_id).all()

    mutable_args = request.args.to_dict()
    mutable_args['event_id'] = str(event_id)
    show_private_text = mutable_args.pop('show_private', None)
    show_private = False
    if show_private_text:
        show_private = show_private_text.lower() == 'true'
    
    data, row_count = helper.filter_model_by_query_and_properties(Session, mutable_args, input_data=sessions, return_objects=True)
    
    tmp_data = data.copy()
    for session in tmp_data:
        if (not session.event_location.publicly_visible and not show_private) or (not session.event_timeslot.publicly_visible and not show_private) and not session.event_timeslot.timeslot.is_break:

            data.remove(session)

    return_obj = [session.to_dict() for session in data]
    return return_obj
    