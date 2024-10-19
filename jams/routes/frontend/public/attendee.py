# Frontend is just for serving pages
from flask import Blueprint, redirect, render_template, url_for
from jams.decorators import attendee_login_required
from jams.util import attendee_auth

bp = Blueprint('attendee', __name__, url_prefix='/attendee')

# URL PREFIX = /public

@bp.route('/login')
def login():
    if attendee_auth.is_authenticated():
        return redirect(url_for('routes.frontend.public.attendee.signup'))
    return render_template(f'public/attendee/attendee_login.html')

@bp.route('/signup')
@attendee_login_required
def signup():
    return render_template(f'public/attendee/signup/check_in_status.html')

@bp.route('/signup/workshop_booking')
@attendee_login_required
def workshop_booking():
    return render_template(f'public/attendee/signup/workshop_booking.html')

@bp.route('/logout', methods=['GET'])
@attendee_login_required
def logout():
    attendee_auth.logout_attendee()
    return redirect(url_for('routes.frontend.public.general.home'))