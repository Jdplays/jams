from flask import Blueprint

from .general import bp as general_bp
from .attendee import bp as attendee_bp

public_bp = Blueprint('public', __name__)

public_bp.register_blueprint(general_bp)
public_bp.register_blueprint(attendee_bp)