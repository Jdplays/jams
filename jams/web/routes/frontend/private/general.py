# Frontend is just for serving pages
from urllib.parse import urlencode
from flask import Blueprint, redirect, render_template, request, url_for, flash
from flask_security import login_required, current_user
from datetime import datetime

from common.configuration import ConfigType, get_config_value
from common.integrations import discord

from web.util.decorators import role_based_access_control_fe

url_prefix = '/private'

bp = Blueprint('general', __name__)

# URL PREFIX = /private

@bp.route('/nav')
def nav():
    return render_template(f'{url_prefix}/nav.html', timestamp=int(datetime.utcnow().timestamp()))

@bp.route('/')
@bp.route('/dashboard')
@login_required
@role_based_access_control_fe
def dashboard():
    return render_template(f'{url_prefix}/dashboard.html')

@bp.route('/users/me')
@bp.route('/users/<int:user_id>')
@login_required
@role_based_access_control_fe
def user_profile(user_id=None):
    args = request.args.to_dict()
    edit = args.get('edit', '').lower() == 'true'
    discord_link_popup = args.get('discord_link_popup', '').lower() == 'true'

    if user_id is None:
        user_id = current_user.id

    is_current_user = (user_id == current_user.id)

    canonical_url = url_for('routes.frontend.private.general.user_profile', user_id=None if is_current_user else user_id)

    # Check for invalid query params
    should_strip = False

    if not is_current_user:
        # Not allowed to use edit or popup at all
        if 'edit' in args or 'discord_link_popup' in args:
            should_strip = True
            args.pop('edit', None)
            args.pop('discord_link_popup', None)
    else:
        # Allowed to use edit, but popup must depend on edit
        if not edit and 'discord_link_popup' in args:
            should_strip = True
            args.pop('discord_link_popup', None)
    
    # Check if path is incorrect or needs a cleanup
    current_url = request.path
    target_url = canonical_url + ('?' + urlencode(args) if args else '')

    if current_url != canonical_url or should_strip:
        return redirect(target_url)
    

    # Check if the current user is view their profile and that the discord bot is enabled
    if is_current_user and get_config_value(ConfigType.DISCORD_BOT_ENABLED):
        DISCORD_CLIENT_ID = get_config_value(ConfigType.DISCORD_CLIENT_ID)
        discord_bot_redirect_uri = discord.get_discord_integration_redirect_uri()

        # Render the page while passing the discord oauth url details
        return render_template(
            f'{url_prefix}/user/profile.html',
            user_id=user_id,
            is_current_user=is_current_user,
            edit=edit,
            discord_link_popup=discord_link_popup,
            DISCORD_CLIENT_ID=DISCORD_CLIENT_ID,
            discord_bot_redirect_uri=discord_bot_redirect_uri
            )
    
    # Render the normal profile page
    return render_template(
        f'{url_prefix}/user/profile.html',
        user_id=user_id,
        is_current_user=is_current_user,
        edit=False,
        discord_link_popup=False,
    )