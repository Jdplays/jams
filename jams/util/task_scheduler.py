import threading
import time
import functools
import json
from enum import Enum
from datetime import datetime, timedelta, UTC
from concurrent.futures import ThreadPoolExecutor
from jams.models import db, TaskSchedulerModel

class TaskActionEnum(Enum):
    TEST_TASK = 'test_task'
    SLEEP_TASK = 'sleep_task'

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
            try:
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
                now = datetime.now(UTC)
                task.run_count += 1
                task.next_run_datetime = (task.last_run_datetime + task.interval).replace(microsecond=0)

                # Ensure last_run_datetime is also offset-aware by assuming it's in UTC
                if task.last_run_datetime.tzinfo is None:
                    task.last_run_datetime = task.last_run_datetime.replace(tzinfo=UTC)
                task.last_run_duration = now - task.last_run_datetime

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

                if task.action_enum == TaskActionEnum.SLEEP_TASK.name:
                    sleep_task(task.params)
                elif task.action_enum == TaskActionEnum.TEST_TASK.name:
                    test_task(**task.params)
            except Exception as e:
                db.session.rollback()
                raise e

def sleep_task(params):
    duration = params.get('duration')
    print('Starting sleep Task')
    time.sleep(duration)
    print('Sleep task finished')

def test_task(name, value):
    print(f'Test task. params = Name: {name}, value: {value}')