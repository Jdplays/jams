from flask import Blueprint

from .admin import bp as admin_bp
from .management import bp as management_bp
from .general import bp as general_bp
from .volunteer import bp as volunteer_bp
from .monitoring import bp as monitoring_bp

private_bp = Blueprint('private', __name__, url_prefix='/private')

private_bp.register_blueprint(admin_bp)
private_bp.register_blueprint(management_bp)
private_bp.register_blueprint(general_bp)
private_bp.register_blueprint(volunteer_bp)
private_bp.register_blueprint(monitoring_bp)