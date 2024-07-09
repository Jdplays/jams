from flask import Blueprint

from .frontend import bp as frontend_bp
from .backend import bp as backend_bp

# Create admin blueprint
management_bp = Blueprint('management', __name__)

# Register the frontend and backend blueprints
management_bp.register_blueprint(frontend_bp)
management_bp.register_blueprint(backend_bp)