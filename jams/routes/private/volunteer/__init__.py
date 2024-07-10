from flask import Blueprint

from .frontend import bp as frontend_bp
from .backend import bp as backend_bp

# Create admin blueprint
volunteer_bp = Blueprint('volunteer', __name__)

# Register the frontend and backend blueprints
volunteer_bp.register_blueprint(frontend_bp)
volunteer_bp.register_blueprint(backend_bp)