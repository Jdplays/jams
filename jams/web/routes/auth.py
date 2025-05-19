# Frontend is just for serving pages
import random
import string
from flask import Blueprint, abort, redirect, url_for, render_template, flash, current_app, session, request
from flask_login import login_required
from flask_security import login_user, logout_user, current_user
from flask_security.utils import hash_password

from common.models import db, User, UserConfig
from common.configuration import ConfigType, get_config_value
from common.extensions import oauth
from common.integrations import discord

from web.forms.flask_security import CustomLoginForm, CustomRegisterForm

bp = Blueprint('auth', __name__)

@bp.route('/login')
def login():
    session.clear()
    next_url = request.args.get('next') or current_app.config['SECURITY_POST_LOGIN_VIEW']

    local_auth_enabled = get_config_value(ConfigType.LOCAL_AUTH_ENABLED)
    oauth_enabled = get_config_value(ConfigType.OAUTH_ENABLED)
    show_default_form = request.args.get('default') == '1'

    if oauth_enabled and not show_default_form:
        client = oauth.create_client(get_config_value(ConfigType.OAUTH_PROVIDER_NAME))
        redirect_uri = url_for('routes.auth.authorise', _external=True, _scheme=get_config_value(ConfigType.HTTP_SCHEME))

        if next_url:
            session['next'] = next_url
            
        return client.authorize_redirect(redirect_uri)
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
    token = client.authorize_access_token()
    
    user_info = token['userinfo']
    user_email = user_info['email']
    user_sub = user_info['sub']

    user = User.query.filter_by(open_id_sub=user_sub).first()
    if not user:
        random_password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
        user = User(
            email=user_email,
            username=user_email,
            password=hash_password(random_password),
            open_id_sub=user_sub)
        db.session.add(user)
        user.activate()
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

@bp.route('/discord/authorise')
@login_required
def discord_callback():
    if not get_config_value(ConfigType.DISCORD_BOT_ENABLED):
        abort(404)

    code = request.args.get('code')
    if not code:
        flash('Authorization failed. No code provided.', 'danger')
        return redirect(url_for('routes.frontend.private.general.user_profile'))

    # Exchange code for access token
    token_response = discord.exchange_code_for_oauth_token(auth_code=code)

    if not token_response.ok:
        flash('Failed to get access token from Discord.', 'danger')
        return redirect(url_for('routes.frontend.private.general.user_profile'))

    access_token = token_response.json().get('access_token')
    if not access_token:
        flash('Invalid access token response.', 'danger')
        return redirect(url_for('routes.frontend.private.general.user_profile'))
    
    # Fetch discord user info
    user_response = discord.get_discord_user_info(access_token)

    if not user_response.ok:
        flash('Failed to fetch Discord user info.', 'danger')
        return redirect(url_for('routes.frontend.private.general.user_profile'))
    
    discord_user = user_response.json()
    discord_id = discord_user.get('id')
    discord_username = discord_user.get('username')

    if not discord_id:
        flash('Discord user ID not found.', 'danger')
        return redirect(url_for('routes.frontend.private.general.user_profile'))
    
    # Check if the discord_id is already linked to a JAMS account
    existing = UserConfig.query.filter_by(discord_account_id=discord_id).first()
    if existing and existing.user_id != current_user.id:
        flash('This Discord account is already linked to another JAMS user.', 'warning')
        return redirect(url_for('routes.frontend.private.general.user_profile'))
    
    # Link discord account to current user
    user_config = UserConfig.query.filter(UserConfig.user_id == current_user.id).first()
    if not user_config:
        user_config = UserConfig(current_user.id)
        db.session.add(user_config)

    user_config.discord_account_id = discord_id
    if discord_username:
        user_config.discord_username = discord_username
    db.session.commit()

    return redirect(url_for('routes.frontend.private.general.user_profile', edit=True, discord_link_popup=True))