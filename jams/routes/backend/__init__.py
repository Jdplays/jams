from flask import Blueprint

from jams.routes.backend.private import private_bp
from jams.routes.backend.public import public_bp

backend_bp = Blueprint('backend', __name__, url_prefix='/backend')

backend_bp.register_blueprint(private_bp)
backend_bp.register_blueprint(public_bp)