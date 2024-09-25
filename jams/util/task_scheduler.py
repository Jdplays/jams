import threading
import time
from datetime import datetime, timedelta, UTC
from jams.models import db, TaskSchedulerModel

class TaskScheduler:
    def __init__(self, app, interval=60) -> None:
        self.app = app
        self.interval = interval
        self.stop_event = threading.Event()

    def run(self):
        print('Starting Task Scheduler...')
        while not self.stop_event.is_set():
            with self.app.app_context():
                self.execute_tasks()
            time.sleep(self.interval)
        
    def stop(self):
        print('Stopping Task Scheduler...')
        self.stop_event.set()

    def execute_tasks(self):
        print('Checking for new tasks...')
        now = datetime.now(UTC)

        tasks = TaskSchedulerModel.query.filter(
            TaskSchedulerModel.next_run_datetime <= now,
            TaskSchedulerModel.end_datetime >= now,
            TaskSchedulerModel.active == True
        ).all()

        for task in tasks:
            self.execute_task(task)
    
    def execute_task(self, task):
        try:
            if task.action_enum == 'test_task':
                print(f'Yay, it works! {task.params}')
            
            task.last_run_datetime = datetime.now(UTC)
            task.run_count += 1
            task.next_run_datetime = task.last_run_datetime + timedelta(seconds=task.interval)

            db.session.commit()
        except Exception as e:
            print(f'Error Executing task {task.id}: {e}')