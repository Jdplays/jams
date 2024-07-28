from flask import Blueprint

from jams.routes.frontend.private import private_bp
from jams.routes.frontend.public import public_bp
from jams.routes.frontend.resources import bp as resources_bp

frontend_bp = Blueprint('frontend', __name__)

frontend_bp.register_blueprint(private_bp)
frontend_bp.register_blueprint(public_bp)
frontend_bp.register_blueprint(resources_bp)