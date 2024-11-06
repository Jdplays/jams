from flask import Blueprint

from .eventbrite import bp as eventbrite_bp
from .auth import bp as auth_bp
from .jolt import bp as jolt_bp

integrations_bp = Blueprint('integrations', __name__, url_prefix='integrations')

integrations_bp.register_blueprint(eventbrite_bp)
integrations_bp.register_blueprint(auth_bp)
integrations_bp.register_blueprint(jolt_bp)