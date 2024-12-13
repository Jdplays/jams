from jams.models import Event

def update_event_attendees_task(event_id):
    from jams.integrations.eventbrite import sync_all_attendees_at_event
    event:Event = Event.query.filter_by(id=event_id).first()
    if not event:
        raise Exception('Requested event does not exist in the database')
    
    sync_all_attendees_at_event(external_event_id=event.external_id)

def calculate_streaks_for_event_task(event_id):
    from jams.util.helper import calculate_streaks
    event:Event = Event.query.filter_by(id=event_id).first()
    if not event:
        raise Exception('Requested event does not exist in the database')
    
    calculate_streaks(event_id)