from flask import Blueprint

from jams.routes.private import private_bp

routes_bp = Blueprint('routes', __name__)

routes_bp.register_blueprint(private_bp)