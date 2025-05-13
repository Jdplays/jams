import os
import pytz
import markdown
from datetime import date, datetime, timedelta, UTC
import requests
from sqlalchemy import Date, cast, func, nullsfirst
from collections.abc import Mapping, Iterable

from common.models import db, Event, User, Role, AttendanceStreak, UserRoles, VolunteerAttendance, FireList, VolunteerSignup, EndpointRule, PageEndpointRule
from common.configuration import ConfigType, get_config_value

def contains_value(obj, value):
    def recursive_search(obj, value):
        if isinstance(obj, str) or isinstance(value, str):
            if str(value).lower() in str(obj).lower():
                return True
        elif isinstance(obj, Mapping):
            for sub_obj in obj.values():
                if recursive_search(sub_obj, value):
                    return True
        elif isinstance(obj, Iterable) and not isinstance(obj, (str, bytes)):
            for sub_obj in obj:
                if recursive_search(sub_obj, value):
                    return True
        else:
            if obj == value:
                return True
        return False
    return recursive_search(obj, value)


def format_timedelta(td: timedelta) -> str:
    days = td.days
    seconds = td.seconds
    microseconds = td.microseconds
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)

    # Build the formatted string
    parts = []
    
    if days > 0:
        parts.append(f"{days} day{'s' if days > 1 else ''}")
    
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours > 1 else ''}")
    
    if minutes > 0:
        parts.append(f"{minutes} minute{'s' if minutes > 1 else ''}")
    
    if seconds > 0:
        parts.append(f"{seconds} second{'s' if seconds > 1 else ''}")
    
    if microseconds > 0:
        parts.append(f"{microseconds} microsecond{'s' if microseconds > 1 else ''}")
    
    # Join the parts into a readable string
    return ", ".join(parts) if parts else "0 seconds"

def try_parse_int(value):
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None
    
def get_table_size(table_name):
    size_in_bytes = db.session.query(func.pg_total_relation_size(table_name)).scalar()
    size_in_mb = size_in_bytes / (1024 * 1024)

    return size_in_mb

def get_next_event(inclusive=True):
    event = None
    if inclusive:
        event = Event.query.filter(cast(Event.date, Date) >= date.today()).order_by(Event.date.asc()).first()
    else:
        event = Event.query.filter(cast(Event.date, Date) > date.today()).order_by(Event.date.asc()).first()
    
    return event

def convert_datetime_to_local_timezone(db_datetime):
    # Assume that any datetime stored in the DB is in UTC
    if isinstance(db_datetime, str):
        db_datetime = datetime.fromisoformat(db_datetime.replace('Z', '+00:00'))
   
    if db_datetime.tzinfo is None:
        # Localize to UTC only if the datetime is naive
        utc_time = pytz.utc.localize(db_datetime)
    else:
        # If it's already timezone-aware, convert it to UTC
        utc_time = db_datetime.astimezone(pytz.utc)

    local_timezone = get_config_value(ConfigType.TIMEZONE)

    try:
        local_timezone = pytz.timezone(local_timezone)
        local_datetime = utc_time.astimezone(local_timezone)
        return local_datetime
    except:
        return utc_time
    
def convert_local_datetime_to_utc(local_datetime_str):

    local_timezone = get_config_value(ConfigType.TIMEZONE)
    try:
        local_datetime = datetime.fromisoformat(local_datetime_str)

        local_timezone = pytz.timezone(local_timezone)
        local_datetime_aware = local_timezone.localize(local_datetime)

        utc_datetime = local_datetime_aware.astimezone(pytz.utc)
        return utc_datetime
    except:
        local_datetime = datetime.fromisoformat(local_datetime_str)

        local_timezone = pytz.timezone('Europe/Dublin')
        local_datetime_aware = local_timezone.localize(local_datetime)

        utc_datetime = local_datetime_aware.astimezone(pytz.utc)
        return utc_datetime
    


def convert_time_to_local_timezone(db_time):
    # Assume db_time is in the format "HH:MM:SS" and is UTC
    utc_time_naive = datetime.combine(datetime.now(UTC).date(), db_time)
    
    # Make the time aware of UTC
    utc_time = pytz.utc.localize(utc_time_naive)
    
    # Get the configured local timezone
    local_timezone = get_config_value(ConfigType.TIMEZONE)
    
    try:
        local_timezone = pytz.timezone(local_timezone)
        local_time = utc_time.astimezone(local_timezone).time()
        return local_time
    except:
        return utc_time.time()  # Return the time in UTC if conversion fails


def convert_local_time_to_utc(local_time):
    if isinstance(local_time, str):
        if len(local_time) == 5:
            time_format = "%H:%M"  # Time without seconds
        else:
            time_format = "%H:%M:%S"  # Time with seconds
        local_time = datetime.strptime(local_time, time_format).time()
    # Assume db_time is in the format "HH:MM:SS" and is UTC
    local_time_naive = datetime.combine(datetime.now(UTC).date(), local_time)
    
    # Get the configured local timezone
    local_timezone = get_config_value(ConfigType.TIMEZONE)
    
    try:
        local_timezone = pytz.timezone(local_timezone)
        local_time_aware = local_timezone.localize(local_time_naive)
        
        # Convert to UTC
        utc_time = local_time_aware.astimezone(pytz.utc).time()
        return utc_time
    except:
        # Fallback to Europe/Dublin if the configured timezone is invalid
        local_timezone = pytz.timezone('Europe/Dublin')
        local_time_aware = local_timezone.localize(local_time_naive)
        
        # Convert to UTC
        utc_time = local_time_aware.astimezone(pytz.utc).time()
        return utc_time



def calculate_session_capacity(session):
    event_location = session.event_location
    location = event_location.location
    workshop = session.workshop

    capacity = 0

    if workshop.capacity is not None:
        capacity = location.capacity if location.capacity < workshop.capacity else workshop.capacity
    
    return capacity

def add_to_streak(user_id, add_freeze=True):
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return

    attendance_streak = AttendanceStreak.query.filter_by(user_id=user_id).first()
    if not attendance_streak:
        attendance_streak = AttendanceStreak(user_id)
        db.session.add(attendance_streak)
    
    attendance_streak.streak += 1
    attendance_streak.total_attended += 1
    if add_freeze:
        attendance_streak.freezes += 1

        if attendance_streak.freezes > 2:
            attendance_streak.freezes = 2

    # Check if this is the longest streak
    if attendance_streak.streak > attendance_streak.longest_streak:
        attendance_streak.longest_streak = attendance_streak.streak
    

def freeze_or_break_streak(user_id):
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return

    attendance_streak = AttendanceStreak.query.filter_by(user_id=user_id).first()
    if not attendance_streak:
        attendance_streak = AttendanceStreak(user_id)
        db.session.add(attendance_streak)
    else:
        if attendance_streak.freezes > 0 and attendance_streak.streak > 0:
            attendance_streak.freezes -= 1
        else:
            attendance_streak.streak = 0
    

def calculate_streaks(event_id):
    event = Event.query.filter_by(id=event_id).first()
    if not event:
        return
    
    # Check if volunteers can get a streak
    volunteer_role = Role.query.filter_by(name='Volunteer').first()
    if not volunteer_role:
        return
    
    users = (
        User.query.join(UserRoles, User.id == UserRoles.user_id)
                  .filter(UserRoles.role_id == volunteer_role.id)
                  .all()
    )

    for user in users:
        # Check if they updated their attendance
        attendance = VolunteerAttendance.query.filter_by(event_id=event_id, user_id=user.id).first()
        if not attendance or not attendance.main:
            freeze_or_break_streak(user.id)
            continue
        
        # Check if they were checked in
        fire_list_entry = FireList.query.filter_by(event_id=event_id, user_id=user.id).first()
        if not fire_list_entry or not fire_list_entry.checked_in:
            freeze_or_break_streak(user.id)
            continue
        
        # Check if they signed up to a workshop
        signups = VolunteerSignup.query.filter_by(event_id=event_id, user_id=user.id).all()
        if not signups:
            freeze_or_break_streak(user.id)
            continue

        add_to_streak(user.id)

    db.session.commit()


def recalculate_streaks():
    try:
        streaks = AttendanceStreak.query.all()
        for streak in streaks:
            streak.streak = 0
            streak.freezes = 2
            streak.total_attended = 0

        events = Event.query.filter(Event.date <= date.today()).order_by(Event.date.asc()).all()
        for event in events:
            calculate_streaks(event.id)
    except Exception as e:
        db.session.rollback()

def get_latest_release():
    url = "https://api.github.com/repos/jdplays/jams/releases/latest"
    headers = {"Accept": "application/vnd.github.v3+json"}
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()

        # Convert Markdown release notes to HTML
        release_notes_html = markdown.markdown(
            data["body"],
            extensions=["fenced_code", "codehilite"]
        )

        return {
            "version": data["tag_name"].lstrip("v"),
            "release_notes": release_notes_html,
            "url": data["html_url"]
        }
    except requests.RequestException:
        return None
    
def remove_event_name_prefix(event_name):
    prefix = get_config_value(ConfigType.EVENT_PREFIX_FILTER)
    if not prefix:
        return event_name
    return event_name.removeprefix(prefix).strip()

def get_endpoint_rule_for_page(endpoint_id, page_id, public=False):
    query = db.session.query(EndpointRule).filter(EndpointRule.endpoint_id == endpoint_id, EndpointRule.public == public)

    if not public:
        query = query.join(PageEndpointRule, EndpointRule.id == PageEndpointRule.endpoint_rule_id)
        query = query.filter(PageEndpointRule.page_id == page_id)
    
    query = query.order_by(nullsfirst(EndpointRule.allowed_fields))

    return query.first()

def prep_delete_role(role):
    # Get all the pages associated with the role
    role_pages = role.role_pages

    for role_page in role_pages:
        db.session.delete(role_page)
    
    db.session.commit()


    if len(role.role_pages) > 0:
        return False
    
    role_endpoint_rules = role.role_endpoint_rules

    for role_endpoint_rule in role_endpoint_rules:
        db.session.delete(role_endpoint_rule)
    
    db.session.commit()


    if len(role.role_endpoint_rules) > 0:
        return False
    
    # Get all the users for a specified role
    users = role.users

    # Iterate through each user and remove the role from them
    for user in users:
        user.remove_roles([role.id])
    
    # Commit the changes to the DB
    db.session.commit()

    # Check if no users have the role
    if len(role.users) > 0:
        # Users still have the role, so return false
        return False
    
    # Everything is removed, so return true
    return True

def validate_api_key(full_api_token, require_websocket=False):
    from common.models import APIKey
    # Ensure the token has the expected format
    try:
        api_key_id, hmac_key = full_api_token.split(':')
    except ValueError:
        return False
    
     # Fetch the API key record by id
    api_key_record = APIKey.query.filter_by(id=api_key_id).first()
    if not api_key_record:
        return False
    
    # Check for websocket requirement
    if require_websocket and not api_key_record.websocket:
        return False
    
     # Check if the API key is active and has not expired
    if not api_key_record.active:
        return False
    elif api_key_record.expiration is not None:
        now = datetime.now(UTC).replace(tzinfo=None)
        if now >= api_key_record.expiration:
            api_key_record.active = False
            db.session.commit()
            return False
    
    # Verify the HMAC
    if not api_key_record.verify_hmac(hmac_key):
        return False
    
    return True

def get_api_key_obj(full_api_token):
    from common.models import APIKey
    if not validate_api_key(full_api_token):
        return None

    # Ensure the token has the expected format
    try:
        api_key_id, hmac_key = full_api_token.split(':')
    except ValueError:
        return None
    
    api_key = APIKey.query.filter_by(id=api_key_id).first()

    if not api_key:
        return None
    
    return api_key

def get_app_version():
    script_dir = os.path.dirname(__file__)
    version_file = os.path.abspath(os.path.join(script_dir, "..", "..", "..", "VERSION"))
    try:
        with open(version_file, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        return "Unknown"
    
def get_hmac_secret():
    return get_config_value(ConfigType.HMAC_SECRET_KEY)