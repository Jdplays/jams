# Frontend is just for serving pages
import random
import string
from flask import Blueprint, abort, current_app, redirect, session, url_for, render_template, request
from flask_security import login_user, logout_user, current_user
from flask_security.utils import hash_password
from jams import oauth
from jams.models import db, User
from jams.configuration import ConfigType, get_config_value
from jams.forms.flask_security import CustomLoginForm, CustomRegisterForm

bp = Blueprint('auth', __name__)

@bp.route('/login')
def login():
    next_url = request.args.get('next') or current_app.config['SECURITY_POST_LOGIN_VIEW']

    local_auth_enabled = get_config_value(ConfigType.LOCAL_AUTH_ENABLED)
    oauth_enabled = get_config_value(ConfigType.OAUTH_ENABLED)
    show_default_form = request.args.get('default') == '1'

    if oauth_enabled and not show_default_form:
        client = oauth.create_client(get_config_value(ConfigType.OAUTH_PROVIDER_NAME))
        redirect_uri = url_for('routes.auth.authorise', _external=True, _scheme=get_config_value(ConfigType.HTTP_SCHEME))

        if next_url:
            session['next'] = next_url
            
        # Trigger the authorization redirect and capture the state
        response = client.authorize_redirect(redirect_uri)
        session['oauth_state'] = request.args.get('state')  # Store the generated state in session
        print("Initial state:", session['oauth_state'])  # Print the initial state
        
        return response
    elif local_auth_enabled:
        form = CustomLoginForm()
        return render_template('/security/login_user.html', login_user_form=form, next=next_url)
    else:
        abort(403)

@bp.route('/register')
def register():
    next_url = request.args.get('next') or current_app.config['SECURITY_POST_LOGIN_VIEW']

    local_auth_enabled = get_config_value(ConfigType.LOCAL_AUTH_ENABLED)
    oauth_enabled = get_config_value(ConfigType.OAUTH_ENABLED)
    show_default_form = request.args.get('default') == '1'

    if oauth_enabled and not show_default_form:
        return redirect(f"{url_for('routes.auth.login')}?next={next_url}")
    elif local_auth_enabled:
        form = CustomRegisterForm()
        return render_template('/security/register_user.html', register_user_form=form, next=next_url)
    else:
        abort(403)


@bp.route('/authorise')
def authorise():
    client = oauth.create_client(get_config_value(ConfigType.OAUTH_PROVIDER_NAME))

    # Retrieve and print both stored and received state
    stored_state = session.get('oauth_state')
    received_state = request.args.get('state')
    print("Stored state:", stored_state)
    print("Received state:", received_state)
    
    if stored_state != received_state:
        print("State mismatch error!")
        return "State mismatch error", 400
    
    token = client.authorize_access_token()
    
    user_info = token['userinfo']
    user_email = None
    if 'email' not in user_info:
        if 'emails' in user_info:
            user_emails = user_info['emails']
            user_email = user_emails[0]
    else:
        user_email = user_info['email']
    user_sub = user_info['sub']

    user = User.query.filter_by(open_id_sub=user_sub).first()
    if not user:
        user = User.query.filter_by(email=user_email).first()
        if not user:
            random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
            user = User(
                email=user_email,
                username=user_email,
                password=hash_password(random_password),
                open_id_sub=user_sub)
            db.session.add(user)
            user.activate()
        else:
            if user.open_id_migration:
                user.open_id_sub = user_sub
                user.open_id_migration = False
            else:
                abort(403)
        db.session.commit()
    
    login_user(user)

    next_url = session.pop('next', None)  # Use pop to remove it from session after retrieval
    if not next_url:  # Ensure next_url is safe
        next_url = current_app.config['SECURITY_POST_LOGIN_VIEW']

    return redirect(next_url)

@bp.route('/logout')
def logout():
    logout_user()
    return redirect('/')