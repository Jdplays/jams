from flask import Blueprint

from .eventbrite import bp as eventbrite_bp

integrations_bp = Blueprint('integrations', __name__, url_prefix='integrations')

integrations_bp.register_blueprint(eventbrite_bp)