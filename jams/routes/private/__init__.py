from flask import Blueprint

from jams.routes.private.admin import admin_bp
from jams.routes.private.management import management_bp
from jams.routes.private.general import general_bp

private_bp = Blueprint('private', __name__)

private_bp.register_blueprint(admin_bp)
private_bp.register_blueprint(management_bp)
private_bp.register_blueprint(general_bp)