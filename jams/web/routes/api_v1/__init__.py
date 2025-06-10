from flask import Blueprint

from web.routes.api_v1.private import private_bp
from web.routes.api_v1.public import public_bp
from web.routes.api_v1.integrations import integrations_bp
from web.routes.api_v1.webhooks import bp as webhooks_bp

api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')

api_v1_bp.register_blueprint(private_bp)
api_v1_bp.register_blueprint(public_bp)
api_v1_bp.register_blueprint(integrations_bp)
api_v1_bp.register_blueprint(webhooks_bp)