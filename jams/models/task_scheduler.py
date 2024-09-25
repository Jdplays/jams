from . import db
from sqlalchemy  import Column, String, Integer, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, UTC

class TaskSchedulerModel (db.Model):
    __tablename__ = 'task_scheduler'

    id = Column(Integer(), primary_key=True)
    name = Column(String(100), nullable=False)
    start_datetime = Column(DateTime, nullable=False, default=datetime.now(UTC))
    end_datetime = Column(DateTime, nullable=True)
    next_run_datetime = Column(DateTime, nullable=True)
    last_run_datetime = Column(DateTime, nullable=True)
    run_count = Column(Integer(), nullable=False, default=0)
    action_enum = Column(String(100), nullable=False)
    interval = Column(Integer(), nullable=True)
    params = Column(JSON, nullable=True)
    private = Column(Boolean, nullable=False, default=True)
    active = Column(Boolean, nullable=False, default=True)

    def __init__(self, name, end_datetime, next_run_datetime, last_run_datetime, action_enum, interval, params, start_datetimet=datetime.now(UTC), run_count=0, private=True, active=True):
        self.name = name
        self.start_datetime = start_datetimet
        self.end_datetime = end_datetime
        self.next_run_datetime = next_run_datetime
        self.last_run_datetime = last_run_datetime
        self.run_count = run_count
        self.action_enum = action_enum
        self.interval = interval
        self.params = params
        self.private = private
        self.active = active