from common.models import Event, Attendee
from common.configuration import ConfigType, get_config_value
from common.util.helper import calculate_streaks

def update_event_attendees_task(event_id):
    from common.integrations.eventbrite import sync_all_attendees_at_event
    event:Event = Event.query.filter_by(id=event_id).first()
    if not event:
        raise Exception('Requested event does not exist in the database')
    
    sync_all_attendees_at_event(external_event_id=event.external_id)

def post_event_task(event_id):
    event:Event = Event.query.filter_by(id=event_id).first()
    if not event:
        raise Exception('Requested event does not exist in the database')
    # Calculate Streaks if enabled
    if get_config_value(ConfigType.STREAKS_ENABLED):
        calculate_streaks(event_id)
    
    # Calculate Event stats
    from common.util import stats
    stats.generate_event_stats(event_id)

    # Check out all remaining attendees
    attendees = Attendee.query.filter(Attendee.event_id == event_id, Attendee.checked_in == True).all()
    for attendee in attendees:
        attendee.check_out()

