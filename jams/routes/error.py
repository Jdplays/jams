# Frontend is just for serving pages
from flask import render_template


def not_found(e):
    return render_template('/error/404.html'), 404

def server_error(e):
    return render_template('/error/500.html'), 500

def forbidden(e):
    return render_template('/error/403.html'), 403