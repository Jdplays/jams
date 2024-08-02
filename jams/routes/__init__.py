from flask import Blueprint

from jams.routes.backend import backend_bp
from jams.routes.frontend import frontend_bp
from jams.routes.resources import bp as resources_bp

routes_bp = Blueprint('routes', __name__)

routes_bp.register_blueprint(backend_bp)
routes_bp.register_blueprint(frontend_bp)
routes_bp.register_blueprint(resources_bp)