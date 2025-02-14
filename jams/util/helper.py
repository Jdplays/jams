import pytz
import markdown
from datetime import date, datetime, timedelta, UTC, time
from flask import abort, request, send_file
from flask_security import current_user
import requests
from sqlalchemy import Date, DateTime, String, Integer, Boolean, cast, func, or_, nullsfirst, asc, desc
from collections.abc import Mapping, Iterable
from jams.models import db, EventLocation, EventTimeslot, Timeslot, Session, EndpointRule, RoleEndpointRule, PageEndpointRule, RolePage, Page, Event, User, Role, AttendanceStreak, UserRoles, VolunteerAttendance, FireList, VolunteerSignup
from jams.configuration import ConfigType, get_config_value


from jams.models.api import APIKey
from jams.util import files

class DefaultRequestArgs():
    pagination_block_size = int
    pagination_start_index = int
    order_by = str
    order_direction = str
    all_rows = bool

    def __init__(self, pagination_block_size=50, pagination_start_index=0, order_by='id', order_direction='ASC', all_rows=False):
        self.pagination_block_size = pagination_block_size
        self.pagination_start_index = pagination_start_index
        self.order_by = order_by
        self.order_direction = order_direction
        self.all_rows = all_rows
    
    @staticmethod
    def list():
        return ['$pagination_block_size', '$pagination_start_index', '$order_by', '$order_direction', '$all_rows']


def get_ordered_event_locations(event_id):
    return EventLocation.query.filter_by(event_id=event_id).order_by(EventLocation.order).all()

def get_ordered_event_timeslots(event_id, public=None):
    if public == None:
        return EventTimeslot.query.join(Timeslot, EventTimeslot.timeslot_id == Timeslot.id).filter(EventTimeslot.event_id == event_id).order_by(Timeslot.start).all()
    return EventTimeslot.query.join(Timeslot, EventTimeslot.timeslot_id == Timeslot.id).filter(EventTimeslot.event_id == event_id, EventTimeslot.publicly_visible == public).order_by(Timeslot.start).all() 

def session_exists(location_id, timeslot_id):
    exists = db.session.query(Session.query.filter_by(event_location_id=location_id, event_timeslot_id=timeslot_id).exists()).scalar()
    return exists

def prep_delete_event_location(event_location_id):
    event_location = EventLocation.query.filter_by(id=event_location_id).first()
    event_sessions = event_location.sessions
    for event_session in event_sessions:
        if not prep_delete_session(event_session.id):
            return False
        db.session.delete(event_session)
    
    # TODO: Remove anything else here in future (Not needed at the time of writing)
    db.session.commit()

    # Check if there are no sessions for this event_location
    if len(event_location.sessions) > 0:
        # There are still sessions, so return false
        return False
    
    # Everything is removed, so return true
    return True


def prep_delete_event_Timeslot(event_timeslot_id):
    event_timeslot = EventTimeslot.query.filter_by(id=event_timeslot_id).first()
    event_sessions = event_timeslot.sessions
    for event_session in event_sessions:
        if not prep_delete_session(event_session.id):
            return False
        db.session.delete(event_session)
    
    # TODO: Remove anything else here in future (Not needed at the time of writing)
    db.session.commit()

    # Check if there are no sessions for this event_timeslot
    if len(event_timeslot.sessions) > 0:
        # There are still sessions, so return false
        return False
    
    # Everything is removed, so return true
    return True

def prep_delete_session(session_id):
    session = Session.query.filter_by(id=session_id).first()
    session_volunteer_signups = session.volunteer_signups

    for volunteer_signup in session_volunteer_signups:
        db.session.delete(volunteer_signup)
    
    # TODO: Remove anything else here in future (Not needed at the time of writing)
    db.session.commit()
    
    # Everything is removed, so return true
    return True

def prep_delete_role(role):
    # Get all the pages assosiated with the role
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
    

def reorder_ids(id_list, target_id, new_index):
    if target_id not in id_list:
        return "Target ID not in list"
    
    if new_index < 0 or new_index > len(id_list):
        return "New index is out of range"
    
    id_list_copy = list(id_list)
    
    current_idex = id_list_copy.index(target_id)

    if current_idex == new_index:
        return id_list_copy

    id_list_copy.pop(current_idex)

    id_list_copy.insert(new_index, target_id)

    return id_list_copy

def remove_id_from_list(id_list, target_id):
    if target_id not in id_list:
        return "Target ID not in list"
    
    current_index = id_list.index(target_id)
    id_list.pop(current_index)

    return id_list

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

def build_multi_object_paginated_return_obj(data_list, pagination_block_size, pagination_start_index, pagination_order_by, pagination_order_direction, pagination_record_count):
    return_obj = {
        'data': data_list,
        'pagination': {
            'pagination_block_size': pagination_block_size,
            'pagination_start_index': pagination_start_index,
            'order_by': pagination_order_by,
            'order_direction': pagination_order_direction,
            'pagination_total_records': pagination_record_count
        }
    }

    return return_obj

def extract_default_args_from_request(request_args)->DefaultRequestArgs:
    default_args = DefaultRequestArgs()
    for search_field, search_value in request_args.items():
        try:
            if search_field == '$pagination_block_size':
                default_args.pagination_block_size = int(search_value)

            if search_field == '$pagination_start_index':
                default_args.pagination_start_index = int(search_value)
            
            if search_field == '$order_by':
                default_args.order_by = search_value
            
            if search_field == '$order_direction':
                default_args.order_direction = search_value
            
            if search_field == '$all_rows':
                default_args.all_rows = search_value.lower() == 'true'
            
        except ValueError:
            abort(400, description=f"Invalid value for field '{search_field}': {search_value}")
    
    return default_args

def filter_model_by_query_and_properties(model, request_args=None, requested_field=None, input_data=None, return_objects=False):
    query = model.query
    objects = []
    properties_values = {}

    # Default parameters
    pagination_block_size = 50
    pagination_start_index = 0
    pagination_order_by = 'id'
    pagination_order_direction = 'ASC'

    if input_data is not None:
        if len(input_data) <= 0 and not return_objects:
            return_obj = build_multi_object_paginated_return_obj(input_data, pagination_block_size, pagination_start_index, pagination_order_by, pagination_order_direction, 0)
            return return_obj
    
    if model.query.count() <= 0:
        return_obj = []
        if not return_objects:
            return_obj = build_multi_object_paginated_return_obj([], pagination_block_size, pagination_start_index, pagination_order_by, pagination_order_direction, 0)
        return (return_obj, 0)
    
    allowed_fields = list(model.query.first_or_404().to_dict().keys())

    order_by = model.id
    order_direction = pagination_order_direction

    # Check if things are being searched for
    if request_args:
        # Check for default fields
        default_args = extract_default_args_from_request(request_args)
        pagination_block_size = default_args.pagination_block_size
        pagination_start_index = default_args.pagination_start_index
        order_by = getattr(model, default_args.order_by)
        order_direction = str(default_args.order_direction).upper()
        if default_args.all_rows:
            row_count = query.count()
            pagination_block_size = row_count

        filters = []

        for search_field, search_value in request_args.items():
            field_conditions = []

            # Split the search fields and values on the pipe char '|'
            search_fields = search_field.split('|')
            search_values = search_value.split('|')


            for field in search_fields:
                if field == '':
                    continue

                if field in DefaultRequestArgs.list():
                    continue

                if field not in allowed_fields:
                    abort(404, description=f"Search field '{field}' not found or allowed")
                
                field_attr = getattr(model, field)

                if isinstance(field_attr, property):
                    properties_values.update({search_field: search_value})
                    continue
                
                field_type = field_attr.property.columns[0].type

                for value in search_values:
                    if value == '':
                        abort(400, description='All query values must have a value')
                    elif value == 'null' or value == 'None':
                        field_conditions.append(field_attr == None)
                    elif isinstance(field_type, String):
                        field_conditions.append(field_attr.ilike(f'%{value}%'))
                    elif isinstance(field_type, Boolean):
                        field_conditions.append(field_attr == (value.lower() in ['true', '1', 't', 'y', 'yes']))
                    elif isinstance(field_type, Integer):
                        try:
                            field_conditions.append(field_attr == int(value))
                        except ValueError:
                            abort(400, description=f"Invalid value for integer field '{field}': {value}")
                    elif isinstance(field_type, DateTime):
                        try:
                            datetime_value = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
                            date_value = datetime_value.date()

                            start_datetime = datetime.combine(date_value, datetime.min.time())
                            end_datetime = start_datetime + timedelta(days=1)
                            
                            field_conditions.append(field_attr.between(start_datetime, end_datetime))
                            #field_conditions.append(field_attr < end_datetime)
                        except ValueError as e:
                            abort(400, description=f"Invalid value for DateTime field '{field}': {value}")
                    else:
                        # For other types, add appropriate handling if needed
                        field_conditions.append(field_attr == value)

            if field_conditions:
                filters.append(or_(*field_conditions))
        
        if filters:
            query = query.filter(*filters)
    
    pagination_record_count = query.count()
    if input_data == None:
        if order_direction == 'ASC':
            query = query.order_by(asc(order_by))
        elif order_direction == 'DESC':
            query = query.order_by(desc(order_by))
        else:
            abort(400, description=f"Invalid Order Direction value: {order_direction}")
    else:
        objects = input_data
    
    if not properties_values:
        query = query.offset(pagination_start_index).limit(pagination_block_size)
    
    if input_data == None or (request_args and len(request_args) > 0):
        objects = query.all()

    if properties_values:
        for obj in objects[:]:
            for prop, value in properties_values.items():
                if not contains_value(getattr(obj, prop), value):
                    objects.remove(obj)
    
        objects = objects[pagination_start_index:pagination_start_index+pagination_block_size]

    data_list = []

    if requested_field:
        if requested_field not in allowed_fields:
            abort(404, description=f"Field '{requested_field}' not found or allowed")
        for obj in objects:
            value = getattr(obj, requested_field)
            if 'time' in requested_field:
                value = convert_time_to_local_timezone(value)
            elif 'date' in requested_field:
                value = convert_datetime_to_local_timezone(value)
            data_list.append({
                'id': obj.id,
                requested_field: str(value)
            })
    else:
        data_list = [obj.to_dict() for obj in objects]

    return_obj = build_multi_object_paginated_return_obj(data_list, pagination_block_size, pagination_start_index, pagination_order_by, pagination_order_direction, pagination_record_count)

    if return_objects:
        return (objects, pagination_record_count)
    
    return return_obj


def check_roles(user_role_ids, role_id):
    if role_id in user_role_ids:
        return True
    
    return False

def extract_endpoint():
    endpoint = request.endpoint
    return endpoint

def get_endpoint_rules_for_roles(endpoint_id, role_ids, public=False):
    query = db.session.query(EndpointRule).filter(EndpointRule.endpoint_id == endpoint_id, EndpointRule.public == public)
    
    if not public:
        query = query.join(RoleEndpointRule, EndpointRule.id == RoleEndpointRule.endpoint_rule_id)
        query = query.filter(RoleEndpointRule.role_id.in_(role_ids))

    query = query.order_by(nullsfirst(EndpointRule.allowed_fields))

    return query.all()

def get_endpoint_rule_for_page(endpoint_id, page_id, public=False):
    query = db.session.query(EndpointRule).filter(EndpointRule.endpoint_id == endpoint_id, EndpointRule.public == public)

    if not public:
        query = query.join(PageEndpointRule, EndpointRule.id == PageEndpointRule.endpoint_rule_id)
        query = query.filter(PageEndpointRule.page_id == page_id)
    
    query = query.order_by(nullsfirst(EndpointRule.allowed_fields))

    return query.first()


def user_has_access_to_page(*names):
    user_role_ids = current_user.role_ids
    for name in names:
        page = Page.query.filter_by(name=name).first()
        if not page:
            return False
        
        page_role_ids = [page_role.role_id for page_role in page.role_pages]
        for role_id in user_role_ids:
            if role_id in page_role_ids:
                return True
    return False

def get_and_prepare_file(bucket_name, file_name, version_id):
    file_data = files.get_file(bucket_name=bucket_name, file_name=file_name, version_id=version_id)

    mime_type = 'application/octet-stream'  # Default MIME type
    if file_name.endswith('.txt'):
        mime_type = 'text/plain'
    elif file_name.endswith('.pdf'):
        mime_type = 'application/pdf'
    elif file_name.endswith('.jpg') or file_name.endswith('.jpeg'):
        mime_type = 'image/jpeg'
    elif file_name.endswith('.png'):
        mime_type = 'image/png'
    elif file_name.endswith('.mp4'):
        mime_type = 'video/mp4'
    elif file_name.endswith('.html'):
        mime_type = 'text/html'
    elif file_name.endswith('.md'):
        mime_type = 'text/markdown'
        
    # Return the file as an inline response
    return send_file(
        file_data,
        mimetype=mime_type,
        as_attachment=False,  # This ensures the file is displayed inline
        download_name=file_name
    )


def get_required_roles_for_endpoint(endpoint):
    from jams.models import Endpoint
    role_names = []

    page = Page.query.filter_by(endpoint=endpoint).first()
    if page:
        role_page_objs = RolePage.query.filter_by(page_id=page.id).all()
        roles = Role.query.filter(Role.id.in_([rp.role_id for rp in role_page_objs]))
        role_names = [r.name for r in roles]
        return role_names


    endpoint_obj = Endpoint.query.filter_by(endpoint=endpoint).first()
    if not endpoint_obj:
        return role_names
    
    endpoint_rule = EndpointRule.query.filter_by(endpoint_id=endpoint_obj.id).first()
    page = Page.query.filter_by(endpoint=endpoint).first()
    if not endpoint_rule and not page:
        return role_names
    
    if not page:
        role_endpoint_rules = endpoint_rule.role_endpoint_rules

        if not role_endpoint_rules:
            return role_names
        
        for role_endpoint_rule in role_endpoint_rules:
            role = role_endpoint_rule.role
            role_names.append(role.name)
    else:
        role_pages = page.role_pages

        if not role_pages:
            return role_names
        
        for role_page in role_pages:
            role = role_page.role
            role_names.append(role.name)
    
    return role_names

def update_session_event_location_visibility(source_session:Session):
    event_location:EventLocation = source_session.event_location
    event_timeslot:EventTimeslot = source_session.event_timeslot

    update_event_location_visibility(event_location)
    update_event_timeslot_visibility(event_timeslot)

    


def update_event_location_visibility(event_location:EventLocation):
    sessions = event_location.sessions

    visibility = False
    for session in sessions:
        if session.publicly_visible and session.has_workshop:
            visibility = True

    event_location.publicly_visible = visibility

    db.session.commit()

def update_event_timeslot_visibility(event_timeslot:EventTimeslot):
    sessions = event_timeslot.sessions

    visibility = False
    for session in sessions:
        if session.publicly_visible and session.has_workshop:
            visibility = True

    event_timeslot.publicly_visible = visibility

    db.session.commit()

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

    local_timezone = get_config_value('TIMEZONE')

    try:
        local_timezone = pytz.timezone(local_timezone)
        local_datetime = utc_time.astimezone(local_timezone)
        return local_datetime
    except:
        return utc_time
    
def convert_local_datetime_to_utc(local_datetime_str):

    local_timezone = get_config_value('TIMEZONE')
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
    
from datetime import datetime
import pytz

def convert_time_to_local_timezone(db_time):
    # Assume db_time is in the format "HH:MM:SS" and is UTC
    utc_time_naive = datetime.combine(datetime.now(UTC).date(), db_time)
    
    # Make the time aware of UTC
    utc_time = pytz.utc.localize(utc_time_naive)
    
    # Get the configured local timezone
    local_timezone = get_config_value('TIMEZONE')
    
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
    local_timezone = get_config_value('TIMEZONE')
    
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

def validate_api_key(full_api_token, require_websocket=False):
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

def schedule_streaks_update_task(event):
    from jams.util import task_scheduler
    if not get_config_value(ConfigType.STREAKS_ENABLED):
        return
    
    midnight = time(00, 00, 00)
    event_day_end = datetime.combine(event.date, midnight)
    end_date = event_day_end + timedelta(days=1, hours=1)
    params_dict = {'event_id': event.id}
    
    task_scheduler.create_task(
        name=f'calculate_streaks_for_event_{event.id}',
        start_datetime=event_day_end,
        end_datetime=end_date,
        action_enum=task_scheduler.TaskActionEnum.CALCULATE_STREAKS_FOR_EVENT,
        interval=timedelta(days=1),
        params=params_dict
    )

def update_scheduled_streak_update_task_date(event, date):
    from jams.util import task_scheduler
    if not get_config_value(ConfigType.STREAKS_ENABLED):
        return
    
    task_name = f'calculate_streaks_for_event_{event.id}'
    params_dict = {'start_datetime': date}
    task_scheduler.modify_task(task_name=task_name, param_dict=params_dict)

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