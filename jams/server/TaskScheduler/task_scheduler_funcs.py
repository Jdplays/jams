from sqlalchemy import and_
from babel.dates import format_date
from datetime import datetime, timedelta, UTC

from common.models import db, Event, Attendee, User, VolunteerAttendance, DiscordBotMessage
from common.configuration import ConfigType, get_config_value
from common.util.helper import calculate_streaks
from common.util import helper
from common.models.config import UserConfig
from common.util.enums import DiscordMessageType, DiscordMessageView

from server.discord import utils as discord_utils

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

# BACKGROUND TASK FUNCTIONS
def background_task():
    bot = discord_utils._get_discord_bot()
    if get_config_value(ConfigType.DISCORD_BOT_ENABLED) and bot.is_ready():
        send_attendance_reminders()
        expire_old_rsvp_messages()
        discord_utils.sync_discord_nicknames()


def send_attendance_reminders():
    bot = discord_utils._get_discord_bot()
    event = helper.get_next_event()
    if not event:
        return
    
    recipients = (
        db.session.query(User)
        .outerjoin(VolunteerAttendance,
            and_(
                User.id == VolunteerAttendance.user_id,
                VolunteerAttendance.event_id == event.id
            )
        )
        .filter(VolunteerAttendance.id == None)
        .all()
    )

    attendance_url = helper.get_volunteer_attendance_url()

    for recipient in recipients:
        if not recipient.config or recipient.config.discord_account_id is None:
            continue

        due_reminder = get_due_reminder(event, recipient)
        if not due_reminder:
            return

        previous_event_reminders = DiscordBotMessage.query.filter(
            DiscordBotMessage.user_id == recipient.id,
            DiscordBotMessage.event_id == event.id,
            DiscordBotMessage.message_type == DiscordMessageType.RSVP_REMINDER.name
        ).all()

        base_message = get_reminder_message(due_reminder, (len(previous_event_reminders) == 0), event.start_date_time)
        full_message = f'🗓️ **{base_message}**\nPlease fill out the form bellow:'

        bot.send_dm_to_user(
            user_id=recipient.id,
            discord_user_id=recipient.config.discord_account_id,
            message=full_message,
            message_type=DiscordMessageType.RSVP_REMINDER,
            view_type=DiscordMessageView.RSVP_REMINDER_VIEW,
            view_data={'url': attendance_url},
            event_id=event.id
        )

        for prev_message in previous_event_reminders:
            bot.update_message(
                message_db_id=prev_message.id,
                expired=True
            )



def get_due_reminder(event, user):
    # Normalise event date to midnight
    event_datetime_normalised = event.start_date_time.replace(hour=0, minute=0, second=0, microsecond=0)
    now_normalised = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)

    # Get the last reminder
    last_reminder_normalised = None
    last_reminder_message = DiscordBotMessage.query.filter(
        DiscordBotMessage.event_id == event.id,
        DiscordBotMessage.message_type == DiscordMessageType.RSVP_REMINDER.name,
        DiscordBotMessage.user_id == user.id
    ).order_by(DiscordBotMessage.timestamp.desc()).first()

    if last_reminder_message:
        last_reminder_normalised = last_reminder_message.timestamp.replace(hour=0, minute=0, second=0, microsecond=0)

    # Reminder thresholds
    reminder_schedule = [
        ('early', timedelta(days=365)), # Anything earlier than 3 weeks
        ("3-week", timedelta(weeks=3)),
        ("2-week", timedelta(weeks=2)),
        ("1-week", timedelta(weeks=1)),
        ("3-day", timedelta(days=3)),
    ]

    for i, (label, delta) in enumerate(reminder_schedule):
        lower_bound = event_datetime_normalised - delta
        
        if i + 1 < len(reminder_schedule):
            next_delta = reminder_schedule[i+1][1]
            upper_bound = event_datetime_normalised - next_delta
        else:
            upper_bound = event_datetime_normalised

        if label == 'early':
            if now_normalised < upper_bound:
                if last_reminder_normalised is None or not (lower_bound <= last_reminder_normalised < upper_bound):
                    return label
                else:
                    return None
        else:
            if lower_bound <= now_normalised < upper_bound:
                if last_reminder_normalised is None or not (lower_bound <= last_reminder_normalised < upper_bound):
                    return label
                else:
                    return None
        
    return None
    
def get_reminder_message(due_reminder, first_reminder, event_date):
    weekday = format_date(event_date, format="EEEE", locale="en_GB")
    month = format_date(event_date, format="MMMM", locale="en_GB")
    day_with_suffix = helper.ordinal(event_date.day)
    default_message = f'Hey, are you free on {weekday} the {day_with_suffix} of {month} for the Jam?'
    match due_reminder:
        case 'early':
            return f'It\'s a while off, but are you thinking of helping out at the Jam on {weekday} the {day_with_suffix} of {month}?'
        case '3-week':
            return default_message
        case '2-week':
            if first_reminder:
                return default_message
            return f'Poke! Are you available on {weekday} the {day_with_suffix} of {month} for the Jam?'
        case '1-week':
            if first_reminder:
                return f'Hey! Are you around to help next {weekday} ({day_with_suffix} of {month}) for the Jam?'
            return f'The Jam is just a week away, are you up for helping out next {weekday} ({day_with_suffix} of {month})'
        case '3-day':
            if first_reminder:
                return f'Just checking, can you help out this {weekday} ({day_with_suffix} of {month}) for the Jam?'
            return f'Only a few days to go! Can we count on you this {weekday} for the Jam?'
        case _:
            return default_message

def expire_old_rsvp_messages():
    bot = discord_utils._get_discord_bot()
    
    current_date = datetime.now(UTC).date()
    days_ago_30 = current_date - timedelta(days=30)

    old_rsvp_messages = DiscordBotMessage.query.filter(
        DiscordBotMessage.message_type == DiscordMessageType.RSVP_REMINDER.name,
        DiscordBotMessage.timestamp < days_ago_30
    ).all()


    for message in old_rsvp_messages:
        bot.update_message(
            message_db_id=message.id,
            expired=True
        )
