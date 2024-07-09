# Frontend is just for serving pages
from flask import Blueprint

bp = Blueprint('backend', __name__, url_prefix='/backend')

# URL PREFIX = /backend
