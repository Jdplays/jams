from datetime import datetime, timedelta, UTC

from common.models import db, TaskSchedulerModel
from common.util.enums import TaskActionEnum

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

def modify_task(task_name, param_dict):
    task = TaskSchedulerModel.query.filter_by(name=task_name).first()
    if not task:
        return
    modified = False
    for field, value in param_dict.items():
        if getattr(task, field) != value:
            modified = True
        setattr(task, field, value)
    
    if modified:
        task.log('modified')


#### Generate Tasks Functions ####

def create_event_tasks(event):
    if event.external:
        from common.integrations.eventbrite import create_event_update_tasks
        task = TaskSchedulerModel.query.filter(TaskSchedulerModel.name == f'update_attendees_for_upcoming_event_{event.id}').first()
        if not task:
            create_event_update_tasks(event)
    
    # Post Event task
    task = TaskSchedulerModel.query.filter(TaskSchedulerModel.name == f'post_event_task_for_event_{event.id}').first()
    if not task:
        event_end = event.end_date_time + timedelta(hours=1)
        end_date = event_end + timedelta(hours=12)
        params_dict = {'event_id': event.id}

        create_task(
            name=f'post_event_task_for_event_{event.id}',
            start_datetime=event_end,
            end_datetime=end_date,
            action_enum=TaskActionEnum.POST_EVENT_TASK,
            interval=timedelta(days=1),
            params=params_dict
        )

def update_scheduled_post_event_task_date(event, date):
    from common.configuration import get_config_value, ConfigType
    if not get_config_value(ConfigType.STREAKS_ENABLED):
        return
    
    task_name = f'post_event_task_for_event_{event.id}'
    params_dict = {
        'start_datetime': date,
        'next_run_datetime': date
        }
    
    modify_task(task_name=task_name, param_dict=params_dict)