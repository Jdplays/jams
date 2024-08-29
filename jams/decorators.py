from flask_security import current_user
from flask import abort, request, current_app
from flask_login.config import EXEMPT_METHODS
from functools import wraps
from jams.util import helper
from jams.models import Page
from jams.configuration import ConfigType, get_config_value


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


def enforce_login(func, *args, **kwargs):
    # Check if request method is exempt or login is disabled
    if request.method in EXEMPT_METHODS or current_app.config.get("LOGIN_DISABLED"):
        return None
    
    # Check if user is authenticated
    if not current_user.is_authenticated:
        return current_app.login_manager.unauthorized()

    # Flask 2.x compatibility for async functions
    if callable(getattr(current_app, "ensure_sync", None)):
        return current_app.ensure_sync(func)(*args, **kwargs)
     
     # Default to calling the original function
    return func(*args, **kwargs)

def role_based_access_control_be(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        endpoint = helper.extract_endpoint()
        user_role_ids = current_user.role_ids if current_user.is_authenticated else None
        endpoint_rules = helper.get_endpoint_rules_for_roles(endpoint, user_role_ids, not current_user.is_authenticated)
        if not endpoint_rules:
            if not current_user.is_authenticated:
                login_response = enforce_login(func, *args, **kwargs)
                if login_response is not None:
                    return login_response
            abort(403, description='You do not have access to the requested resource with your current role')

        requested_field = kwargs.get('field')
        
        for rule in endpoint_rules:
            if rule.allowed_fields is None:
                return func(*args, **kwargs)
            allowed_fields = [x.strip() for x in str(rule.allowed_fields).split(',')]
            

            if requested_field in allowed_fields:
                if request.args is not None:
                    query_fields = request.args.keys()
                    for field in query_fields:
                        if field not in allowed_fields:
                            if not current_user.is_authenticated:
                                login_response = enforce_login(func, *args, **kwargs)
                                if login_response is not None:
                                    return login_response
                            abort(403, description='You do not have access to the requested resource with your current role')
                return func(*args, **kwargs)
        if not current_user.is_authenticated:
            login_response = enforce_login(func, *args, **kwargs)
            if login_response is not None:
                return login_response
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

def eventbrite_inetegration_route(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        enabled = get_config_value(ConfigType.EVENTBRITE_ENABLED)

        if not enabled:
            abort(400, description='The requested route is not currently enabled')
        return func(*args, **kwargs)
    return wrapper