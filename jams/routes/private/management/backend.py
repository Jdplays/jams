# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify
from flask_security import roles_required, login_required
from jams.models import db, Workshop, Location, Timeslot

bp = Blueprint('backend', __name__)

# URL PREFIX = /admin

@bp.route('/get_workshop_catalog_table', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_workshop_catalog_table():
    workshops = Workshop.query.all()
    workshops_data_list = []
    for workshop in workshops:
        workshops_data_list.append({
            'id': workshop.id,
            'name': workshop.name,
            'description': workshop.description,
            'min_volunteers': workshop.min_volunteers,
            'active': workshop.active
        })
    return jsonify({
        'workshops': workshops_data_list
    })

@bp.route('/get_workshop_details/<int:workshop_id>', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first()
    return jsonify({
        'id': workshop.id,
        'name': workshop.name,
        'description': workshop.description,
        'min_volunteers': workshop.min_volunteers,
        'active': workshop.active
    })

@bp.route('/add_workshop', methods=['POST'])
@login_required
@roles_required('Volunteer')
def add_workshop():
    try:
        name = request.form.get('name')
        description = request.form.get('description')
        min_volunteers = request.form.get('min_volunteers')
        new_workshop = Workshop(name=name, description=description, min_volunteers=min_volunteers)
        db.session.add(new_workshop)
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to add new workshop'
        })

    return jsonify({
        'status': 'success',
        'message': 'New workshop has been added to the system'
    })

@bp.route('/edit_workshop', methods=['POST'])
@login_required
@roles_required('Volunteer')
def edit_workshop():
    try:
        data = request.get_json()
        workshop_id = data.get('workshop_id')
        name = data.get('name')
        description = data.get('description')
        min_volunteers = data.get('min_volunteers')
        workshop = Workshop.query.filter_by(id=workshop_id).first()
        workshop.name = name
        workshop.description = description
        workshop.min_volunteers = min_volunteers
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to edit workshop'
        })

    return jsonify({
        'status': 'success',
        'message': 'Workshop has been successfuly edited'
    })

@bp.route('/archive_workshop', methods=['POST'])
@login_required
@roles_required('Volunteer')
def archive_workshop():
    try:
        data = request.get_json()
        workshop_id = data.get('workshop_id')
        workshop = Workshop.query.filter_by(id=workshop_id).first()
        workshop.archive()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to archive workshop'
        })

    return jsonify({
        'status': 'success',
        'message': 'Workshop has been archived'
    })

@bp.route('/activate_workshop', methods=['POST'])
@login_required
@roles_required('Volunteer')
def activate_workshop():
    try:
        data = request.get_json()
        workshop_id = data.get('workshop_id')
        workshop = Workshop.query.filter_by(id=workshop_id).first()
        workshop.activate()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to activate workshop'
        })

    return jsonify({
        'status': 'success',
        'message': 'Workshop has been activated'
    })

@bp.route('/get_locations_table', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_locations_table():
    locations = Location.query.all()
    locations_data_list = []
    for location in locations:
        locations_data_list.append({
            'id': location.id,
            'name': location.name,
            'active': location.active
        })
    return jsonify({
        'locations': locations_data_list
    })

@bp.route('/get_location_details/<int:location_id>', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_location(location_id):
    location = Location.query.filter_by(id=location_id).first()
    return jsonify({
        'id': location.id,
        'name': location.name,
        'active': location.active
    })

@bp.route('/add_location', methods=['POST'])
@login_required
@roles_required('Volunteer')
def add_location():
    try:
        name = request.form.get('name')
        new_location = Location(name=name)
        db.session.add(new_location)
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to add new location'
        })

    return jsonify({
        'status': 'success',
        'message': 'New location has been added to the system'
    })

@bp.route('/edit_location', methods=['POST'])
@login_required
@roles_required('Volunteer')
def edit_location():
    try:
        data = request.get_json()
        location_id = data.get('location_id')
        name = data.get('name')
        location = Location.query.filter_by(id=location_id).first()
        location.name = name
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to edit location'
        })

    return jsonify({
        'status': 'success',
        'message': 'Location has been successfuly edited'
    })

@bp.route('/archive_location', methods=['POST'])
@login_required
@roles_required('Volunteer')
def archive_location():
    try:
        data = request.get_json()
        location_id = data.get('location_id')
        location = Location.query.filter_by(id=location_id).first()
        location.archive()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to archive location'
        })

    return jsonify({
        'status': 'success',
        'message': 'Location has been archived'
    })

@bp.route('/activate_location', methods=['POST'])
@login_required
@roles_required('Volunteer')
def activate_location():
    try:
        data = request.get_json()
        location_id = data.get('location_id')
        location = Location.query.filter_by(id=location_id).first()
        location.activate()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to activate location'
        })

    return jsonify({
        'status': 'success',
        'message': 'Location has been activated'
    })

## Timeslots


@bp.route('/get_timeslots_table', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_timeslots_table():
    timeslots = Timeslot.query.all()
    timeslots_data_list = []
    for timeslot in timeslots:
        timeslots_data_list.append({
            'id': timeslot.id,
            'name': timeslot.name,
            'start': str(timeslot.start),
            'end': str(timeslot.end),
            'active': timeslot.active
        })
    return jsonify({
        'timeslots': timeslots_data_list
    })

@bp.route('/get_timeslot_details/<int:timeslot_id>', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_timeslot(timeslot_id):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first()
    return jsonify({
        'id': timeslot.id,
        'name': timeslot.name,
        'start': str(timeslot.start),
        'end': str(timeslot.end),
        'active': timeslot.active
    })

@bp.route('/add_timeslot', methods=['POST'])
@login_required
@roles_required('Volunteer')
def add_timeslot():
    try:
        name = request.form.get('name')
        start = request.form.get('start_time')
        end = request.form.get('end_time')
        new_timeslot = Timeslot(name=name, start=start, end=end)
        db.session.add(new_timeslot)
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to add new timeslot'
        })

    return jsonify({
        'status': 'success',
        'message': 'New timeslot has been added to the system'
    })

@bp.route('/edit_timeslot', methods=['POST'])
@login_required
@roles_required('Volunteer')
def edit_timeslot():
    try:
        data = request.get_json()
        timeslot_id = data.get('timeslot_id')
        name = data.get('name')
        start = data.get('start_time')
        end = data.get('end_time')
        timeslot = Timeslot.query.filter_by(id=timeslot_id).first()
        timeslot.name = name
        timeslot.start = start
        timeslot.end = end
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to edit timeslot'
        })

    return jsonify({
        'status': 'success',
        'message': 'Timeslot has been successfuly edited'
    })

@bp.route('/archive_timeslot', methods=['POST'])
@login_required
@roles_required('Volunteer')
def archive_timeslot():
    try:
        data = request.get_json()
        timeslot_id = data.get('timeslot_id')
        timeslot = Timeslot.query.filter_by(id=timeslot_id).first()
        timeslot.archive()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to archive timeslot'
        })

    return jsonify({
        'status': 'success',
        'message': 'Timeslot has been archived'
    })

@bp.route('/activate_timeslot', methods=['POST'])
@login_required
@roles_required('Volunteer')
def activate_timeslot():
    try:
        data = request.get_json()
        timeslot_id = data.get('timeslot_id')
        timeslot = Timeslot.query.filter_by(id=timeslot_id).first()
        timeslot.activate()
        db.session.commit()
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'An Error occured when trying to activate timeslot'
        })

    return jsonify({
        'status': 'success',
        'message': 'Timeslot has been activated'
    })