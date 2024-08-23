# Backend is just for serving data to javascript
from flask import Blueprint, request, jsonify, abort
from jams.decorators import role_based_access_control_be
from flask_security import login_required
from jams.models import db, Workshop, Location, Timeslot, DifficultyLevel, File, WorkshopFile
from jams.util import helper
from jams.util import files

bp = Blueprint('management', __name__)

# URL PREFIX = /backend

#------------------------------------------ WORKSHOP ------------------------------------------#

@bp.route('/workshops', methods=['GET'])
@role_based_access_control_be
def get_workshops():
    workshops = helper.filter_model_by_query_and_properties(Workshop, request.args)
    return jsonify(workshops)


@bp.route('/workshops/<field>', methods=['GET'])
@role_based_access_control_be
def get_workshops_field(field):
    workshops = helper.filter_model_by_query_and_properties(Workshop, request.args, field)
    return jsonify(workshops)


@bp.route('/workshops/<int:workshop_id>', methods=['GET'])
@role_based_access_control_be
def get_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    return jsonify(workshop.to_dict())


@bp.route('/workshops/<int:workshop_id>/<field>', methods=['GET'])
@role_based_access_control_be
def get_workshop_field(workshop_id, field):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()

    allowed_fields = list(workshop.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(workshop, field)})


@bp.route('/workshops', methods=['POST'])
@role_based_access_control_be
def add_workshop():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    description = data.get('description')
    min_volunteers = data.get('min_volunteers')
    difficulty_id = data.get('difficulty_id')

    if not name or not description or min_volunteers == None or not difficulty_id or difficulty_id == '-1':
        abort(400, description="No 'name' or 'description' or 'min_volunteers' or 'difficulty_id' provided")

    new_workshop = Workshop(name=name, description=description, min_volunteers=min_volunteers, difficulty_id=difficulty_id)
    db.session.add(new_workshop)
    db.session.commit()

    return jsonify(new_workshop.to_dict())


@bp.route('/workshops/<int:workshop_id>', methods=['PATCH'])
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
@role_based_access_control_be
def archive_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    workshop.archive()
    db.session.commit()

    return jsonify({'message': 'The workshop has been successfully archived'})

@bp.route('/workshops/<int:workshop_id>/activate', methods=['POST'])
@role_based_access_control_be
def activate_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    workshop.activate()
    db.session.commit()

    return jsonify({'message': 'The workshop has been successfully activated'})

@bp.route('/workshops/<int:workshop_id>/worksheet', methods=['POST'])
@role_based_access_control_be
def add_worksheet(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    file = request.files['file']
    folder_name = workshop.name.replace(" ", "_")
    file_path = f'{folder_name}/{file.filename}'
    file_db_obj = files.upload_file(bucket_name=files.workshop_bucket, file_name=file_path, file_data=file.stream)

    if not file_db_obj:
        abort(400, description='An error occured while uploading the file')
    
    workshop_file = WorkshopFile.query.filter_by(file_id=file_db_obj.id).first()
    if not workshop_file:
        workshop_file = WorkshopFile(workshop_id=workshop_id, file_id=file_db_obj.id, type='worksheet')
        db.session.add(workshop_file)
        db.session.commit()
    return jsonify({'message': 'File successfully uploaded'})


@bp.route('/workshops/files', methods=['GET'])
@role_based_access_control_be
def get_workshop_files():
    workshop_files = helper.filter_model_by_query_and_properties(WorkshopFile, request.args, return_objects=True)
    if not workshop_files:
        abort(404)
    files = [wf.file for wf in workshop_files]
    data = helper.filter_model_by_query_and_properties(File, input_data=files)
    return jsonify(data)

@bp.route('/workshops/<int:workshop_id>/files/<uuid:file_id>/data', methods=['GET'])
@role_based_access_control_be
def get_file_data(workshop_id, file_id):
    workshop_file = WorkshopFile.query.filter_by(workshop_id=workshop_id, file_id=file_id).first_or_404()
    file = workshop_file.file
    return jsonify(file.to_dict())

@bp.route('/workshops/<int:workshop_id>/files/<uuid:file_id>/data', methods=['PATCH'])
@role_based_access_control_be
def edit_file_data(workshop_id, file_id):
    workshop_file = WorkshopFile.query.filter_by(workshop_id=workshop_id, file_id=file_id).first_or_404()
    
    file = workshop_file.file
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")
    
    for field, value in data.items():
        if field == 'current_version_id':
            setattr(file, field, value)
        if field == 'public':
            setattr(file, field, (value == ['True', 'true', 'T', 't', '1']))
    
    db.session.commit()
    
    return jsonify(file.to_dict())


@bp.route('/workshops/<int:workshop_id>/files/<uuid:file_id>/versions', methods=['GET'])
@role_based_access_control_be
def get_file_versions(workshop_id, file_id):
    workshop_file = WorkshopFile.query.filter_by(workshop_id=workshop_id, file_id=file_id).first_or_404()
    file = workshop_file.file
    return_obj = [file_version.to_dict() for file_version in file.versions]
    return jsonify({'file_versions': return_obj})

@bp.route('/workshops/<int:workshop_id>/files/<uuid:file_id>', methods=['GET'])
@role_based_access_control_be
def get_workshop_file(workshop_id, file_id):
    WorkshopFile.query.filter_by(workshop_id=workshop_id, file_id=file_id).first_or_404()
    file = File.query.filter_by(id=file_id).first_or_404()
    if request.args:
        version_id = request.args.get('version_id')
        if version_id:
            return helper.get_and_prepare_file(files.workshop_bucket, file.name, version_id)
    return helper.get_and_prepare_file(files.workshop_bucket, file.name, file.current_version_id)

#------------------------------------------ LOCATION ------------------------------------------#

@bp.route('/locations', methods=['GET'])
@role_based_access_control_be
def get_locations():
    data = helper.filter_model_by_query_and_properties(Location, request.args)
    return jsonify(data)


@bp.route('/locations/<field>', methods=['GET'])
@role_based_access_control_be
def get_locations_field(field):
    data = helper.filter_model_by_query_and_properties(Location, request.args, field)
    return jsonify(data)


@bp.route('/locations/<int:location_id>', methods=['GET'])
@role_based_access_control_be
def get_location(location_id):
    location = Location.query.filter_by(id=location_id).first_or_404()
    return jsonify(location.to_dict())


@bp.route('/locations/<int:location_id>/<field>', methods=['GET'])
@role_based_access_control_be
def get_location_field(location_id, field):
    location = Location.query.filter_by(id=location_id).first_or_404()

    allowed_fields = list(location.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(location, field)})
    

@bp.route('/locations', methods=['POST'])
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
@role_based_access_control_be
def archive_location(location_id):
        location = Location.query.filter_by(id=location_id).first_or_404()
        location.archive()
        db.session.commit()

        return jsonify({'message': 'The location has been successfully archived'})


@bp.route('/locations/<int:location_id>/activate', methods=['POST'])
@role_based_access_control_be
def activate_location(location_id):
    location = Location.query.filter_by(id=location_id).first_or_404()
    location.activate()
    db.session.commit()

    return jsonify({'message': 'The location has been successfully activated'})

#------------------------------------------ TIMESLOT ------------------------------------------#

@bp.route('/timeslots', methods=['GET'])
@role_based_access_control_be
def get_timeslots():
    data = helper.filter_model_by_query_and_properties(Timeslot, request.args)
    return jsonify(data)


@bp.route('/timeslots/<field>', methods=['GET'])
@role_based_access_control_be
def get_timeslots_field(field):
    data = helper.filter_model_by_query_and_properties(Timeslot, request.args, field)
    return jsonify(data)


@bp.route('/timeslots/<int:timeslot_id>', methods=['GET'])
@role_based_access_control_be
def get_timeslot(timeslot_id):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
    return jsonify(timeslot.to_dict())


@bp.route('/timeslots/<int:timeslot_id>/<field>', methods=['GET'])
@role_based_access_control_be
def get_timeslot_field(timeslot_id, field):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()

    allowed_fields = list(timeslot.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(timeslot, field)})
    

@bp.route('/timeslots', methods=['POST'])
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
@role_based_access_control_be
def archive_timeslot(timeslot_id):
        timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
        timeslot.archive()
        db.session.commit()

        return jsonify({'message': 'The timeslot has been successfully archived'})


@bp.route('/timeslots/<int:timeslot_id>/activate', methods=['POST'])
@role_based_access_control_be
def activate_timeslot(timeslot_id):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
    timeslot.activate()
    db.session.commit()

    return jsonify({'message': 'The timeslot has been successfully activated'})


#------------------------------------------ DIFFICULTY LEVEL ------------------------------------------#

@bp.route('/difficulty_levels', methods=['GET'])
@role_based_access_control_be
def get_difficulty_levels():
    data = helper.filter_model_by_query_and_properties(DifficultyLevel, request.args)
    return jsonify(data)

@bp.route('/difficulty_levels/<int:difficulty_id>', methods=['GET'])
@role_based_access_control_be
def get_difficulty_level(difficulty_id):
    difficulty = DifficultyLevel.query.filter_by(id=difficulty_id).first_or_404()
    return jsonify(difficulty.to_dict())


