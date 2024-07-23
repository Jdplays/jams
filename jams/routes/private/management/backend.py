# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify, abort
from jams.decorators import role_based_access_control_be
from flask_security import login_required
from jams.models import db, Workshop, Location, Timeslot, DifficultyLevel
from jams.util import helper

bp = Blueprint('backend', __name__, url_prefix='/backend')

# URL PREFIX = /backend

#------------------------------------------ WORKSHOP ------------------------------------------#

@bp.route('/workshops', methods=['GET'])
@login_required
@role_based_access_control_be
def get_workshops():
    workshops = helper.filter_model_by_query_and_properties(Workshop, request.args, Workshop.id)
    workshops_data_list = [workshop.to_dict() for workshop in workshops]
    return jsonify({'workshops': workshops_data_list})


@bp.route('/workshops/<field>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_workshops_field(field):
    workshops = helper.filter_model_by_query_and_properties(Workshop, request.args, Workshop.id)
    allowed_fields = list(Workshop.query.first_or_404().to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    workshops_data_list = []
    for workshop in workshops:
        workshops_data_list.append({
            'id': workshop.id,
            field: getattr(workshop, field)
        })
        
    return jsonify({'workshops': workshops_data_list})


@bp.route('/workshops/<int:workshop_id>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    return jsonify(workshop.to_dict())


@bp.route('/workshops/<int:workshop_id>/<field>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_workshop_field(workshop_id, field):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()

    allowed_fields = list(workshop.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(workshop, field)})


@bp.route('/workshops', methods=['POST'])
@login_required
@role_based_access_control_be
def add_workshop():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    description = data.get('description')
    min_volunteers = data.get('min_volunteers')

    if not name or not description or not min_volunteers:
        abort(400, description="No 'name' or 'description' or 'min_volunteers' provided")

    new_workshop = Workshop(name=name, description=description, min_volunteers=min_volunteers)
    db.session.add(new_workshop)
    db.session.commit()

    return jsonify({
        'message': 'New workshop has been successfully added',
        'workshop': new_workshop.to_dict()
    })


@bp.route('/workshops/<int:workshop_id>', methods=['PATCH'])
@login_required
@role_based_access_control_be
def edit_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(workshop.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            setattr(workshop, field, value)

    db.session.commit()

    return jsonify({
        'message': 'Workshop has be updated successfully',
        'workshop': workshop.to_dict()
    })


@bp.route('/workshops/<int:workshop_id>/archive', methods=['POST'])
@login_required
@role_based_access_control_be
def archive_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    workshop.archive()
    db.session.commit()

    return jsonify({'message': 'The workshop has been successfully archived'})

@bp.route('/workshops/<int:workshop_id>/activate', methods=['POST'])
@login_required
@role_based_access_control_be
def activate_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    workshop.activate()
    db.session.commit()

    return jsonify({'message': 'The workshop has been successfully activated'})

#------------------------------------------ LOCATION ------------------------------------------#

@bp.route('/locations', methods=['GET'])
@login_required
@role_based_access_control_be
def get_locations():
    locations_data_list = [location.to_dict() for location in Location.query.order_by(Location.id).all()]
    return jsonify({'locations': locations_data_list})


@bp.route('/locations/<field>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_locations_field(field):
    allowed_fields = list(Location.query.first_or_404().to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    locations_data_list = []
    for location in Location.query.all():
        locations_data_list.append({
            'id': location.id,
            field: getattr(location, field)
        })
        
    return jsonify({'locations': locations_data_list})


@bp.route('/locations/<int:location_id>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_location(location_id):
    location = Location.query.filter_by(id=location_id).first_or_404()
    return jsonify(location.to_dict())


@bp.route('/locations/<int:location_id>/<field>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_location_field(location_id, field):
    location = Location.query.filter_by(id=location_id).first_or_404()

    allowed_fields = list(location.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(location, field)})
    

@bp.route('/locations', methods=['POST'])
@login_required
@role_based_access_control_be
def add_location():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')

    if not name:
        abort(400, description="No 'name' provided")

    new_location = Location(name=name)
    db.session.add(new_location)
    db.session.commit()

    return jsonify({
        'message': 'New location has been successfully added',
        'location': new_location.to_dict()
    })

@bp.route('/locations/<int:location_id>', methods=['PATCH'])
@login_required
@role_based_access_control_be
def edit_location(location_id):
    location = Location.query.filter_by(id=location_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(location.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            setattr(location, field, value)

    db.session.commit()

    return jsonify({
        'message': 'Location has be updated successfully',
        'location': location.to_dict()
    }) 


@bp.route('/locations/<int:location_id>/archive', methods=['POST'])
@login_required
@role_based_access_control_be
def archive_location(location_id):
        location = Location.query.filter_by(id=location_id).first_or_404()
        location.archive()
        db.session.commit()

        return jsonify({'message': 'The location has been successfully archived'})


@bp.route('/locations/<int:location_id>/activate', methods=['POST'])
@login_required
@role_based_access_control_be
def activate_location(location_id):
    location = Location.query.filter_by(id=location_id).first_or_404()
    location.activate()
    db.session.commit()

    return jsonify({'message': 'The location has been successfully activated'})

#------------------------------------------ TIMESLOT ------------------------------------------#

@bp.route('/timeslots', methods=['GET'])
@login_required
@role_based_access_control_be
def get_timeslots():
    timeslots_data_list = [timeslot.to_dict() for timeslot in Timeslot.query.order_by(Timeslot.id).all()]
    return jsonify({'timeslots': timeslots_data_list})


@bp.route('/timeslots/<field>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_timeslots_field(field):
    allowed_fields = list(Timeslot.query.first_or_404().to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    timeslots_data_list = []
    for timeslot in Timeslot.query.all():
        timeslots_data_list.append({
            'id': timeslot.id,
            field: getattr(timeslot, field)
        })
        
    return jsonify({'timeslots': timeslots_data_list})


@bp.route('/timeslots/<int:timeslot_id>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_timeslot(timeslot_id):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
    return jsonify(timeslot.to_dict())


@bp.route('/timeslots/<int:timeslot_id>/<field>', methods=['GET'])
@login_required
@role_based_access_control_be
def get_timeslot_field(timeslot_id, field):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()

    allowed_fields = list(timeslot.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(timeslot, field)})
    

@bp.route('/timeslots', methods=['POST'])
@login_required
@role_based_access_control_be
def add_timeslot():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    start = data.get('start')
    end = data.get('end')

    if not name:
        abort(400, description="No 'name' provided")

    new_timeslot = Timeslot(name=name, start=start, end=end)
    db.session.add(new_timeslot)
    db.session.commit()

    return jsonify({
        'message': 'New timeslot has been successfully added',
        'timeslot': new_timeslot.to_dict()
    })

@bp.route('/timeslots/<int:timeslot_id>', methods=['PATCH'])
@login_required
@role_based_access_control_be
def edit_timeslot(timeslot_id):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(timeslot.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            setattr(timeslot, field, value)

    db.session.commit()

    return jsonify({
        'message': 'Timeslot has be updated successfully',
        'timeslot': timeslot.to_dict()
    }) 


@bp.route('/timeslots/<int:timeslot_id>/archive', methods=['POST'])
@login_required
@role_based_access_control_be
def archive_timeslot(timeslot_id):
        timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
        timeslot.archive()
        db.session.commit()

        return jsonify({'message': 'The timeslot has been successfully archived'})


@bp.route('/timeslots/<int:timeslot_id>/activate', methods=['POST'])
@login_required
@role_based_access_control_be
def activate_timeslot(timeslot_id):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
    timeslot.activate()
    db.session.commit()

    return jsonify({'message': 'The timeslot has been successfully activated'})


#------------------------------------------ DIFFICULTY LEVEL ------------------------------------------#

@bp.route('/difficulty_levels', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_difficulty_levels():
    difficulty_levels_data_list = [difficulty.to_dict() for difficulty in DifficultyLevel.query.order_by(DifficultyLevel.id).all()]
    return jsonify({'difficulty_levels': difficulty_levels_data_list})

@bp.route('/difficulty_levels/<int:difficulty_id>', methods=['GET'])
@login_required
@roles_required('Volunteer')
def get_difficulty_level(difficulty_id):
    difficulty = DifficultyLevel.query.filter_by(id=difficulty_id).first_or_404()
    return jsonify(difficulty.to_dict())


