from . import db
from sqlalchemy  import Column, Time, Interval, Integer, TIMESTAMP, ForeignKey, Float, JSON
from datetime import datetime, UTC

class EventStats(db.Model):
    __tablename__ = 'event_stats'

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer(), ForeignKey('event.id'), nullable=False)
    total_registered = Column(Integer(), nullable=False)
    total_checked_in = Column(Integer(), nullable=False)
    created_at = Column(TIMESTAMP(), nullable=False)

    gender_distribution = Column(JSON(), nullable=True)
    age_distribution = Column(JSON(), nullable=True)
    check_in_trend = Column(JSON(), nullable=True)
    workshop_popularity = Column(JSON(), nullable=True)
    dropout_workshops = Column(JSON(), nullable=True)
    workshop_overlap = Column(JSON(), nullable=True)

    last_event_id = Column(Integer(), ForeignKey('event.id'), nullable=True)
    average_leave_time = Column(Time(), nullable=True)
    average_duration = Column(Interval(), nullable=True)
    retention_rate = Column(Float(), nullable=True)

    def __init__(self, event_id, total_registered, total_checked_in, gender_distribution=None, age_distribution=None, check_in_trend=None, workshop_popularity=None,
                 dropout_workshops=None, workshop_overlap=None, last_event_id=None, average_leave_time=None, average_duration=None, retention_rate=None):
        self.created_at = datetime.now(UTC)
        self.event_id = event_id
        self.total_registered = total_registered
        self.total_checked_in = total_checked_in
        self.gender_distribution = gender_distribution
        self.age_distribution = age_distribution
        self.check_in_trend = check_in_trend
        self.workshop_popularity = workshop_popularity
        self.dropout_workshops = dropout_workshops
        self.workshop_overlap = workshop_overlap
        self.last_event_id = last_event_id
        self.average_leave_time = average_leave_time
        self.average_duration = average_duration
        self.retention_rate = retention_rate
    
    def to_dict(self):
        from jams.util import helper, stats
        created_at = helper.convert_datetime_to_local_timezone(self.created_at)
        average_leave_time = helper.convert_time_to_local_timezone(self.average_leave_time)
        check_in_trend = stats.convert_check_in_trend_to_Local_timezone(self.check_in_trend)
        return {
            'id': self.id,
            'event_id': self.event_id,
            'last_event_id': self.last_event_id,
            'total_registered': self.total_registered,
            'total_checked_in': self.total_checked_in,
            'gender_distribution': self.gender_distribution,
            'age_distribution': self.age_distribution,
            'check_in_trend': check_in_trend,
            'workshop_popularity': self.workshop_popularity,
            'dropout_workshops': self.dropout_workshops,
            'workshop_overlap': self.workshop_overlap,
            'average_leave_time': str(average_leave_time),
            'average_duration': str(self.average_duration),
            'retention_rate': self.retention_rate,
            'created_at': created_at.isoformat()
        }