from flask_security import current_user
from flask import abort, redirect, request, current_app, url_for, jsonify
from flask_login.config import EXEMPT_METHODS
from functools import wraps

from common.util import helper as common_helper
from common.models import db, Page, Attendee, Endpoint, EndpointRule, APIKeyEndpoint
from common.configuration import ConfigType, get_config_value

from web.util import helper, attendee_auth


#------------------------------------------ RBAC ------------------------------------------#

def role_based_access_control_fe(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        user_role_ids = current_user.role_ids
        endpoint = helper.extract_endpoint()
        page = Page.query.filter_by(endpoint=endpoint).first_or_404()
        if page.default:
            return func(*args, **kwargs)
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

def rbac_api(func, *args, **kwargs):
    endpoint = helper.extract_endpoint()
    endpoint_obj = Endpoint.query.filter_by(endpoint=endpoint).first()
    # Are there any endpoint rules where this endpoint is default
    default_endpoint_rule = EndpointRule.query.filter_by(endpoint_id=endpoint_obj.id, default=True).first()
    if default_endpoint_rule and current_user.is_authenticated:
        return func(*args, **kwargs)
    
    user_role_ids = current_user.role_ids if current_user.is_authenticated else None
    endpoint_rules = helper.get_endpoint_rules_for_roles(endpoint_obj.id, user_role_ids, not current_user.is_authenticated)
    if not endpoint_rules:
        if not current_user.is_authenticated:
            login_response = enforce_login(func, *args, **kwargs)
            if login_response is not None:
                return login_response
        return jsonify({'error': 'You do not have access to the requested resource with your current role'}), 403

    requested_field = kwargs.get('field')
    
    for rule in endpoint_rules:
        if rule.allowed_fields is None:
            return func(*args, **kwargs)
        allowed_fields = [x.strip() for x in str(rule.allowed_fields).split(',')]
        

        if requested_field in allowed_fields:
            if request.args is not None:
                query_fields = request.args.keys()
                if len(query_fields) == 0:
                    return func(*args, **kwargs)
                for field in query_fields:
                    default_args_list = helper.DefaultRequestArgs.list()
                    if field not in allowed_fields and field not in default_args_list:
                        if not current_user.is_authenticated:
                            login_response = enforce_login(func, *args, **kwargs)
                            if login_response is not None:
                                return login_response
                    elif field in allowed_fields or field in default_args_list:
                        return func(*args, **kwargs)
                    
    if not current_user.is_authenticated:
        login_response = enforce_login(func, *args, **kwargs)
        if login_response is not None:
            return login_response
    return jsonify({'error': 'You do not have access to the requested resource with your current role'}), 403

def api_route(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        endpoint = helper.extract_endpoint()
        endpoint_obj = Endpoint.query.filter_by(endpoint=endpoint).first()
        api_key = request.headers.get('Authorization')
        if api_key:
            api_key_obj = common_helper.get_api_key_obj(api_key)
            if not api_key_obj:
                return jsonify({'error': 'Invalid API key'}), 403
            
            api_key_valid = db.session.query(APIKeyEndpoint.query.filter_by(api_key_id=api_key_obj.id, endpoint_id=endpoint_obj.id).exists()).scalar()

            if not api_key_valid:
                return jsonify({'error': 'API key does not have access to the requested resource'}), 403
            else:
                return func(*args, **kwargs)
        else:
            return rbac_api(func, *args, **kwargs)
        
    return wrapper


def protect_user_updates(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        current_user_id = current_user.id
        user_id = int(kwargs.get('user_id'))

        user_management_request = helper.user_has_access_to_page('user_management')
        if current_user_id is not user_id and not user_management_request:
            return jsonify({'error': 'You do not have access to the requested resource with your current role'}), 403
        return func(*args, **kwargs)
    return wrapper

def eventbrite_integration_route(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        enabled = get_config_value(ConfigType.EVENTBRITE_ENABLED)

        if not enabled:
            return jsonify({'error': 'The requested route is not currently enabled'}), 400
        return func(*args, **kwargs)
    return wrapper

def attendee_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not attendee_auth.is_authenticated():
            # Redirect to login page if not logged in
            return redirect(url_for('routes.frontend.public.attendee.login'))
        return f(*args, **kwargs)
    return decorated_function


def protect_attendee_updates(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        current_attendee_account_id = attendee_auth.current_attendee().id
        requested_attendee_id = int(kwargs.get('attendee_id'))

        requested_attendee = Attendee.query.filter_by(id=requested_attendee_id).first()

        if not requested_attendee or requested_attendee.attendee_account_id is not current_attendee_account_id:
            return jsonify({'error': 'You do not have access to the requested resource'}), 403
        return func(*args, **kwargs)
    return wrapper