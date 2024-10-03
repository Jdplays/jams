import threading
import time
import functools
from enum import Enum
from datetime import datetime, timedelta, UTC
from concurrent.futures import ThreadPoolExecutor
from jams.models import db, TaskSchedulerModel
from jams.util import task_scheduler_funcs

class TaskActionEnum(Enum):
    UPDATE_EVENTBRITE_EVENT_ATTENDEES = 'update_eventbrite_event_attendees'

class TaskScheduler:
    def __init__(self, app, interval=60, max_workers=4) -> None:
        self.app = app
        self.interval = interval
        self.stop_event = threading.Event()
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def run(self):
        print('Starting Task Scheduler...')

        # Reset tasks running state to false
        with self.app.app_context():
            db.session.query(TaskSchedulerModel).update({TaskSchedulerModel.running: False})
            db.session.commit()

        while not self.stop_event.is_set():
            now = datetime.now(UTC).replace(microsecond=0)
            next_minute = (now + timedelta(minutes=1)).replace(second=0, microsecond=0)
            sleep_duration = (next_minute - now).total_seconds()

            time.sleep(sleep_duration)

            with self.app.app_context():
                self.check_tasks()
        
    def stop(self):
        print('Stopping Task Scheduler...')
        self.stop_event.set()
        self.executor.shutdown(wait=True)

    def task_done_callback(self, future, task_id):
         with self.app.app_context():
            task = TaskSchedulerModel.query.filter_by(id=task_id).first()
            now = datetime.now(UTC)
            try:
                # Ensure last_run_datetime is also offset-aware by assuming it's in UTC
                if task.last_run_datetime.tzinfo is None:
                    task.last_run_datetime = task.last_run_datetime.replace(tzinfo=UTC)
                task.last_run_duration = now - task.last_run_datetime

                db.session.commit()

                # Check if the task was completed successfully
                if future.exception() is None:
                    task.log_finished()
                    return
                else:
                    task.log(f'raised an exception: {future.exception()}')
            finally:
                # Set running to false to indicate that the task is not currently being ran
                task.running = False

                # Set the last run duration, next run time and run count
                task.run_count += 1
                task.next_run_datetime = (task.last_run_datetime + task.interval).replace(microsecond=0)

                task.queued = False

                db.session.commit()

    def check_tasks(self):
        now = datetime.now(UTC)

        old_tasks = TaskSchedulerModel.query.filter(
            TaskSchedulerModel.end_datetime <= now,
            TaskSchedulerModel.running == False,
            TaskSchedulerModel.active == True,
            TaskSchedulerModel.queued == False
        )

        for task in old_tasks:
            task.disable_task()
        db.session.commit()

        tasks = TaskSchedulerModel.query.filter(
            TaskSchedulerModel.next_run_datetime <= now,
            TaskSchedulerModel.end_datetime >= now,
            TaskSchedulerModel.running == False,
            TaskSchedulerModel.active == True,
            TaskSchedulerModel.queued == False
        ).all()

        for task in tasks:
            future = self.executor.submit(self.run_task, task_id=task.id)
            task.queued = True
            db.session.commit()
            future.add_done_callback(functools.partial(self.task_done_callback, task_id=task.id))
    
    def run_task(self, task_id):
        with self.app.app_context():
            task = TaskSchedulerModel.query.filter_by(id=task_id).first()

            try:
                with self.app.app_context():
                    # Set running to true to signal that the task is currently being ran
                    task.running = True
                    task.queued = False
                    task.last_run_datetime = datetime.now(UTC)
                    db.session.commit()

                task.log_started()

                if task.action_enum == TaskActionEnum.UPDATE_EVENTBRITE_EVENT_ATTENDEES.name:
                    task_scheduler_funcs.update_event_attendees_task(**task.params)
            except Exception as e:
                db.session.rollback()
                raise e


def create_task(name, action_enum:TaskActionEnum, interval, params=None, start_datetime=datetime.now(UTC), end_datetime=datetime.now(UTC), run_quantity=None, private=True):
    new_task:TaskSchedulerModel = TaskSchedulerModel(name=name, action_enum=action_enum.name, interval=interval, params=params, start_datetime=start_datetime, end_datetime=end_datetime, run_quantity=run_quantity, private=private)
    existing_task:TaskSchedulerModel = TaskSchedulerModel.query.filter_by(name=name).first()

    if existing_task:
        existing_task.enable_task()
        existing_task.action_enum = new_task.action_enum
        existing_task.interval = new_task.interval
        existing_task.params = new_task.params
        existing_task.start_datetime = new_task.start_datetime
        existing_task.end_datetime = new_task.end_datetime
        existing_task.next_run_datetime = new_task.next_run_datetime
        existing_task.private = new_task.private

        db.session.commit()
        return
    
    
    db.session.add(new_task)
    db.session.commit()

    new_task.log('created')