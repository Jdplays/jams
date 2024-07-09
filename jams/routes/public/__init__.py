from flask import Blueprint

from jams.routes.public.general import general_bp

public_bp = Blueprint('public', __name__)

public_bp.register_blueprint(general_bp)