# Backend is just for serving data to javascript
from flask import Blueprint

bp = Blueprint('backend', __name__, url_prefix='/backend')

# URL PREFIX = /backend