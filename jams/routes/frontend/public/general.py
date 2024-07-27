# Frontend is just for serving pages
from flask import Blueprint, render_template

bp = Blueprint('general', __name__)

# URL PREFIX = /public

@bp.route('/nav')
def nav():
    return render_template(f'public/nav.html')

@bp.route('/')
def home():
    return render_template(f'public/home.html')