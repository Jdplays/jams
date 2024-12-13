from jams.models import db, Event
from jams.util import helper

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

    helper.schedule_streaks_update_task(event)

    return event