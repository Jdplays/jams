from flask import Blueprint

from .frontend import bp as frontend_bp
from .backend import bp as backend_bp

# Create admin blueprint
general_bp = Blueprint('general', __name__)

# Register the frontend and backend blueprints
general_bp.register_blueprint(frontend_bp)
general_bp.register_blueprint(backend_bp)