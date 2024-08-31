from flask import abort, request, send_file
from jams.models import db, EventLocation, EventTimeslot, Timeslot, Session, EndpointRule, RoleEndpointRule, PageEndpointRule, Page, RolePage
from collections.abc import Mapping, Iterable
from sqlalchemy import Date, DateTime, String, Integer, Boolean, or_, nullsfirst, asc, desc
from flask_security import current_user
from datetime import datetime, timedelta

from jams.util import files


def get_ordered_event_locations(event_id):
    return EventLocation.query.filter_by(event_id=event_id).order_by(EventLocation.order).all()

def get_ordered_event_timeslots(event_id):
    return EventTimeslot.query.join(Timeslot, EventTimeslot.timeslot_id == Timeslot.id).filter(EventTimeslot.event_id == event_id).order_by(Timeslot.start).all() 

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
    ############ This is not needed anymore, but will be needed in the future. So will leave it #######
    session = Session.query.filter_by(id=session_id).first()
    
    # TODO: Remove anything else here in future (Not needed at the time of writing)
    
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

def filter_model_by_query_and_properties(model, request_args=None, requested_field=None, input_data=None, return_objects=False):
    query = model.query
    objects = []
    properties_values = {}

    # Default parameters
    default_field_names = ['$pagination_block_size', '$pagination_start_index', '$order_by', '$order_direction']
    pagination_block_size = 50
    pagination_start_index = 0
    pagination_order_by = 'id'
    pagination_order_direction = 'ASC'

    if input_data is not None:
        if len(input_data) <= 0:
            return_obj = build_multi_object_paginated_return_obj(input_data, pagination_block_size, pagination_start_index, pagination_order_by, pagination_order_direction, 0)
            return return_obj
    
    allowed_fields = list(model.query.first_or_404().to_dict().keys())

    order_by = model.id
    order_direction = pagination_order_direction

    # Check if things are being searched for
    if request_args:
        filters = []

        for search_field, search_value in request_args.items():
            # Check for default fields
            if search_field in default_field_names:
                try:
                    if search_field == '$pagination_block_size':
                        pagination_block_size = int(search_value)

                    if search_field == '$pagination_start_index':
                        pagination_start_index = int(search_value)
                    
                    if search_field == '$order_by':
                        pagination_order_by = search_value
                        order_by = getattr(model, search_value)
                    
                    if search_field == '$order_direction':
                        pagination_order_direction = search_value
                        order_direction = str(search_value).upper()
                    
                except ValueError:
                    abort(400, description=f"Invalid value for field '{search_field}': {search_value}")
            else:
                field_conditions = []

                # Split the search fields and values on the pipe char '|'
                search_fields = search_field.split('|')
                search_values = search_value.split('|')


                for field in search_fields:
                    if field == '':
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
    if input_data == None:
        if order_direction == 'ASC':
            objects = query.order_by(asc(order_by)).all()
        elif order_direction == 'DESC':
            objects = query.order_by(desc(order_by)).all()
        else:
            abort(400, description=f"Invalid Order Direction value: {order_direction}")
    else:
        objects = input_data

    if properties_values:
        for obj in objects[:]:
            for prop, value in properties_values.items():
                if not contains_value(getattr(obj, prop), value):
                    objects.remove(obj)
    
    trimmed_objects = objects[pagination_start_index:pagination_start_index+pagination_block_size]

    data_list = []

    if requested_field:
        if requested_field not in allowed_fields:
            abort(404, description=f"Field '{requested_field}' not found or allowed")
        for obj in trimmed_objects:
            data_list.append({
                'id': obj.id,
                requested_field: getattr(obj, requested_field)
            })
    else:
        data_list = [obj.to_dict() for obj in trimmed_objects]

    pagination_record_count = query.count()
    return_obj = build_multi_object_paginated_return_obj(data_list, pagination_block_size, pagination_start_index, pagination_order_by, pagination_order_direction, pagination_record_count)

    if return_objects:
        return trimmed_objects
    
    return return_obj


def check_roles(user_role_ids, role_id):
    if role_id in user_role_ids:
        return True
    
    return False

def extract_endpoint():
    endpoint = request.endpoint
    view_args = request.view_args
    for key, value in view_args.items():
        endpoint = endpoint.replace(str(value), f"<{key}>")
    return endpoint

def get_endpoint_rules_for_roles(endpoint, role_ids, public=False):
    query = db.session.query(EndpointRule).filter(EndpointRule.endpoint == endpoint, EndpointRule.public == public)
    
    if not public:
        query = query.join(RoleEndpointRule, EndpointRule.id == RoleEndpointRule.endpoint_rule_id)
        query = query.filter(RoleEndpointRule.role_id.in_(role_ids))

    query = query.order_by(nullsfirst(EndpointRule.allowed_fields))

    return query.all()

def get_endpoint_rule_for_page(endpoint, page_id, public=False):
    query = db.session.query(EndpointRule).filter(EndpointRule.endpoint == endpoint, EndpointRule.public == public)

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
    role_names = []
    endpoint_rule = EndpointRule.query.filter_by(endpoint=endpoint).first()
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