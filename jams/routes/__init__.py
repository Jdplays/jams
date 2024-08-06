from flask import Blueprint, request
from flask_security import current_user
from jams.util import helper
from jams.models import db, PrivateAccessLog

from jams.routes.backend import backend_bp
from jams.routes.frontend import frontend_bp
from jams.routes.resources import bp as resources_bp

routes_bp = Blueprint('routes', __name__)

routes_bp.register_blueprint(backend_bp)
routes_bp.register_blueprint(frontend_bp)
routes_bp.register_blueprint(resources_bp)

@routes_bp.after_request
def before_all_requests(response):
    if current_user.is_authenticated:
        status_code = response.status_code
        endpoint = helper.extract_endpoint()
        user_roles = [role.name for role in current_user.roles]
        required_roles = helper.get_required_roles_for_endpoint(endpoint)

        # Create Audit log entry
        log_entry = PrivateAccessLog(
            url=request.full_path,
            internal_endpoint = endpoint,
            user_id=current_user.id,
            user_role_names=user_roles,
            required_role_names=required_roles,
            status_code=status_code
            )
        
        db.session.add(log_entry)
        db.session.commit()
    return response