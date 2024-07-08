from flask import Blueprint

from .frontend import bp as frontend_bp
from .backend import bp as backend_bp

# Create admin blueprint
admin_bp = Blueprint('admin', __name__)

# Register the frontend and backend blueprints
admin_bp.register_blueprint(frontend_bp)
admin_bp.register_blueprint(backend_bp)