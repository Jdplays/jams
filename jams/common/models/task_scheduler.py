from . import db
from sqlalchemy  import Column, ForeignKey, String, Integer, DateTime, Boolean, JSON, Time
from sqlalchemy.dialects.postgresql import INTERVAL
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from common.util import helper

class TaskSchedulerModel(db.Model):
    __tablename__ = 'task_scheduler'

    id = Column(Integer(), primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    start_datetime = Column(DateTime, nullable=False, default=datetime.now(UTC))
    end_datetime = Column(DateTime, nullable=True)
    next_run_datetime = Column(DateTime, nullable=True)
    last_run_datetime = Column(DateTime, nullable=True)
    run_count = Column(Integer(), nullable=False, default=0)
    action_enum = Column(String(100), nullable=False)
    interval = Column(INTERVAL, nullable=True)
    last_run_duration = Column(INTERVAL, nullable=True)
    params = Column(JSON, nullable=True)
    private = Column(Boolean(), nullable=False, default=True, server_default='true')
    active = Column(Boolean(), nullable=False, default=True, server_default='true')
    running = Column(Boolean(), nullable=False, default=False, server_default='false')
    queued = Column(Boolean(), nullable=False, default=False, server_default='false')
    event_id = Column(Integer, ForeignKey('event.id'), nullable=True)
    fixed_time = Column(Time, nullable=True)

    def __init__(self, name, action_enum, interval, params=None, start_datetime=datetime.now(UTC), end_datetime=datetime.now(UTC), run_quantity=None, private=True, event_id=None, fixed_time=None):
        self.name = name
        self.start_datetime = start_datetime
        if not run_quantity:
            self.end_datetime = end_datetime
        else:
            self.end_datetime = start_datetime + (interval * run_quantity)
        self.next_run_datetime = start_datetime
        self.last_run_datetime = None
        self.run_count = 0
        self.action_enum = action_enum
        self.interval = interval
        self.last_run_duration = None
        self.params = params
        self.private = private
        self.active = True
        self.running = False
        self.queued = False
        self.event_id = event_id
        self.fixed_time = fixed_time

    def enable_task(self):
        self.active = True
        self.log('has been activated')
    def disable_task(self):
        self.active = False
        self.log('has been deactivated')
    
    def log(self, message):
        log = TaskSchedulerLog(task_id=self.id, log=f'Task - {self.id}: {self.name} {message}')
        db.session.add(log)
        db.session.commit()
    
    def log_started(self):
        self.log('has started')

    def log_finished(self):
        self.log(f'has successfully finished after taking {helper.format_timedelta(self.last_run_duration)}')

class TaskSchedulerLog(db.Model):
    __tablename__ = 'task_scheduler_log'

    id = Column(Integer(), primary_key=True)
    date_time = Column(DateTime, nullable=False, default=datetime.now(UTC))
    task_id = Column(Integer(), ForeignKey('task_scheduler.id'), nullable=True)
    log = Column(String, nullable=False)

    task = relationship('TaskSchedulerModel', backref='logs')

    def __init__(self, task_id, log):
        self.date_time = datetime.now(UTC)
        self.task_id = task_id
        self.log = log

    @staticmethod
    def size():
        return helper.get_table_size(TaskSchedulerLog.__tablename__)
    
    def to_dict(self):
        date_time = helper.convert_datetime_to_local_timezone(self.date_time)
        return {
            'id': self.id,
            'date_time': date_time.isoformat(),
            'task_id': self.task_id,
            'log': self.log
        }