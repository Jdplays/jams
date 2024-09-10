from flask import Blueprint, redirect, url_for
from flask_security import current_user

from jams.routes.frontend.private import private_bp
from jams.routes.frontend.public import public_bp

frontend_bp = Blueprint('frontend', __name__)

frontend_bp.register_blueprint(private_bp)
frontend_bp.register_blueprint(public_bp)

@frontend_bp.route('/home_router')
def universal_home_page():
    if current_user.is_authenticated:
        return redirect(url_for('routes.frontend.private.general.dashboard'))
    else:
        return redirect(url_for('routes.frontend.public.general.home'))