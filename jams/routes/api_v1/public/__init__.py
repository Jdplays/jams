from flask import Blueprint

from .general import bp as general_bp

public_bp = Blueprint('public', __name__)

public_bp.register_blueprint(general_bp)