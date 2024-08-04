from flask_security import current_user
from flask import abort, request
from jams.util import helper
from jams.models import Page, EndpointRule
from functools import wraps


#------------------------------------------ RBAC ------------------------------------------#

def role_based_access_control_fe(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        user_role_ids = current_user.role_ids
        endpoint = helper.extract_endpoint()
        page = Page.query.filter_by(endpoint=endpoint).first_or_404()
        page_role_ids = [page_role.role_id for page_role in page.role_pages]

        for role_id in page_role_ids:
            if role_id in user_role_ids:
                return func(*args, **kwargs)
        abort(403, description='You do not have access to the requested resource with your current role')
    return wrapper



def role_based_access_control_be(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        user_role_ids = current_user.role_ids
        requested_field = kwargs.get('field')

        endpoint = helper.extract_endpoint()
        endpoint_rules = helper.get_endpoint_rules_for_roles(endpoint, user_role_ids)
        if not endpoint_rules:
            abort(403, description='You do not have access to the requested resource with your current role')
        
        for rule in endpoint_rules:
            if rule.allowed_fields is None:
                return func(*args, **kwargs)
            allowed_fields = [x.strip() for x in str(rule.allowed_fields).split(',')]
            

            if requested_field in allowed_fields:
                if request.args is not None:
                    query_fields = request.args.keys()
                    for field in query_fields:
                        if field not in allowed_fields:
                            abort(403, description='You do not have access to the requested resource with your current role')
                return func(*args, **kwargs)
        abort(403, description='You do not have access to the requested resource with your current role')
    return wrapper


def protect_user_updates(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        current_user_id = current_user.id
        user_id = int(kwargs.get('user_id'))

        user_management_request = helper.user_has_access_to_page('user_management')
        if current_user_id is not user_id and not user_management_request:
            abort(403, description='You do not have access to the requested resource')
        return func(*args, **kwargs)
    return wrapper