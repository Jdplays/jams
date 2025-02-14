# API is for serving data to Typscript/Javascript
from flask import Blueprint, request, jsonify, abort
from jams.decorators import api_route
from flask_security import login_required
from jams.models import db, Workshop, Location, Timeslot, DifficultyLevel, File, WorkshopFile, WorkshopType
from jams.util import helper
from jams.util import files

bp = Blueprint('management', __name__)

# URL PREFIX = /api/v1

#------------------------------------------ WORKSHOP ------------------------------------------#

@bp.route('/workshops', methods=['GET'])
@api_route
def get_workshops():
    workshops = helper.filter_model_by_query_and_properties(Workshop, request.args)
    return jsonify(workshops)


@bp.route('/workshops/<field>', methods=['GET'])
@api_route
def get_workshops_field(field):
    workshops = helper.filter_model_by_query_and_properties(Workshop, request.args, field)
    return jsonify(workshops)


@bp.route('/workshops/<int:workshop_id>', methods=['GET'])
@api_route
def get_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    return jsonify(workshop.to_dict())


@bp.route('/workshops/<int:workshop_id>/<field>', methods=['GET'])
@api_route
def get_workshop_field(workshop_id, field):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()

    allowed_fields = list(workshop.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(workshop, field)})


@bp.route('/workshops', methods=['POST'])
@api_route
def add_workshop():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    description = data.get('description')
    difficulty_id = data.get('difficulty_id')
    min_volunteers = data.get('min_volunteers')
    capacity = data.get('capacity')
    overflow = data.get('overflow')
    workshop_type_id = data.get('workshop_type_id')
    

    if not name or not description or not difficulty_id or difficulty_id == '-1':
        abort(400, description="No 'name' or 'description' or 'difficulty_id' provided")

    new_workshop = Workshop(name=name, description=description, min_volunteers=min_volunteers, difficulty_id=difficulty_id, capacity=capacity, overflow=overflow, workshop_type_id=workshop_type_id)
    db.session.add(new_workshop)
    db.session.commit()

    return jsonify({
        'message': 'Workshop successfully added',
        'data': new_workshop.to_dict()
        })


@bp.route('/workshops/<int:workshop_id>', methods=['PATCH'])
@api_route
def edit_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()

    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    allowed_fields = list(workshop.to_dict().keys())
    for field, value in data.items():
        if field in allowed_fields:
            if field == 'difficulty_id':
                diff = DifficultyLevel.query.filter_by(id=value).first()
                if not diff:
                    diff = DifficultyLevel.query.first()
                    setattr(workshop, field, diff.id)
                    continue
            setattr(workshop, field, value)
            if field == 'workshop_type_id':
                workshop.update_workshop_permissions()


    db.session.commit()

    return jsonify({
        'message': 'Workshop has be updated successfully',
        'workshop': workshop.to_dict()
    })


@bp.route('/workshops/<int:workshop_id>/archive', methods=['POST'])
@api_route
def archive_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    workshop.archive()
    db.session.commit()

    return jsonify({'message': 'The workshop has been successfully archived'})

@bp.route('/workshops/<int:workshop_id>/activate', methods=['POST'])
@api_route
def activate_workshop(workshop_id):
    workshop = Workshop.query.filter_by(id=workshop_id).first_or_404()
    workshop.activate()
    db.session.commit()

    return jsonify({'message': 'The workshop has been successfully activated'})

@bp.route('/workshops/<int:workshop_id>/files', methods=['POST'])
@api_route
def add_workshop_file(workshop_id):
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
    else:
        workshop_file.activate()
    return jsonify({
        'message': 'File successfully uploaded',
        'file_data': file_db_obj.to_dict()
    })

@bp.route('/workshops/<int:workshop_id>/files/<string:file_uuid>/archive', methods=['POST'])
@api_route
def archive_workshop_file(workshop_id, file_uuid):
    Workshop.query.filter_by(id=workshop_id).first_or_404()
    workshop_file = WorkshopFile.query.filter_by(workshop_id=workshop_id, file_id=file_uuid).first_or_404()
    
    workshop_file.archive()

    return jsonify({'message': 'Workshop File successfully archived'})

@bp.route('/workshops/<int:workshop_id>/files/<string:file_uuid>/activate', methods=['POST'])
@api_route
def activate_workshop_file(workshop_id, file_uuid):
    Workshop.query.filter_by(id=workshop_id).first_or_404()
    workshop_file = WorkshopFile.query.filter_by(workshop_id=workshop_id, file_id=file_uuid).first_or_404()
    
    workshop_file.activate()

    return jsonify({'message': 'Workshop File successfully activated'})




@bp.route('/workshops/<int:workshop_id>/files', methods=['GET'])
@api_route
def get_workshop_files(workshop_id):
    args = request.args.to_dict()
    args['workshop_id'] = str(workshop_id)
    workshop_files, row_count = helper.filter_model_by_query_and_properties(WorkshopFile, args, return_objects=True)
    files = [wf.file for wf in workshop_files]
    data = helper.filter_model_by_query_and_properties(File, input_data=files)
    return jsonify(data)

@bp.route('/workshops/<int:workshop_id>/files/<uuid:file_id>/data', methods=['GET'])
@api_route
def get_file_data(workshop_id, file_id):
    workshop_file = WorkshopFile.query.filter_by(workshop_id=workshop_id, file_id=file_id).first_or_404()
    file = workshop_file.file
    return jsonify(file.to_dict())

@bp.route('/workshops/<int:workshop_id>/files/<uuid:file_id>/data', methods=['PATCH'])
@api_route
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

#------------------------------------------ LOCATION ------------------------------------------#

@bp.route('/locations', methods=['GET'])
@api_route
def get_locations():
    args = request.args.to_dict()
    if 'active' not in args:
        args['active'] = str(True)

    data = helper.filter_model_by_query_and_properties(Location, args)
    return jsonify(data)


@bp.route('/locations/<field>', methods=['GET'])
@api_route
def get_locations_field(field):
    args = request.args.to_dict()
    if 'active' not in args:
        args['active'] = str(True)

    data = helper.filter_model_by_query_and_properties(Location, args, field)
    return jsonify(data)


@bp.route('/locations/<int:location_id>', methods=['GET'])
@api_route
def get_location(location_id):
    location = Location.query.filter_by(id=location_id).first_or_404()
    return jsonify(location.to_dict())


@bp.route('/locations/<int:location_id>/<field>', methods=['GET'])
@api_route
def get_location_field(location_id, field):
    location = Location.query.filter_by(id=location_id).first_or_404()

    allowed_fields = list(location.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(location, field)})
    

@bp.route('/locations', methods=['POST'])
@api_route
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
@api_route
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
@api_route
def archive_location(location_id):
        location = Location.query.filter_by(id=location_id).first_or_404()
        location.archive()
        db.session.commit()

        return jsonify({'message': 'The location has been successfully archived'})


@bp.route('/locations/<int:location_id>/activate', methods=['POST'])
@api_route
def activate_location(location_id):
    location = Location.query.filter_by(id=location_id).first_or_404()
    location.activate()
    db.session.commit()

    return jsonify({'message': 'The location has been successfully activated'})

#------------------------------------------ TIMESLOT ------------------------------------------#

@bp.route('/timeslots', methods=['GET'])
@api_route
def get_timeslots():
    args = request.args.to_dict()
    if 'active' not in args:
        args['active'] = str(True)

    data = helper.filter_model_by_query_and_properties(Timeslot, args)
    return jsonify(data)


@bp.route('/timeslots/<field>', methods=['GET'])
@api_route
def get_timeslots_field(field):
    args = request.args.to_dict()
    if 'active' not in args:
        args['active'] = str(True)

    data = helper.filter_model_by_query_and_properties(Timeslot, args, field)
    return jsonify(data)


@bp.route('/timeslots/<int:timeslot_id>', methods=['GET'])
@api_route
def get_timeslot(timeslot_id):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
    return jsonify(timeslot.to_dict())


@bp.route('/timeslots/<int:timeslot_id>/<field>', methods=['GET'])
@api_route
def get_timeslot_field(timeslot_id, field):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()

    allowed_fields = list(timeslot.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: getattr(timeslot, field)})
    

@bp.route('/timeslots', methods=['POST'])
@api_route
def add_timeslot():
    data = request.get_json()
    if not data:
        abort(400, description="No data provided")

    name = data.get('name')
    start = data.get('start')
    end = data.get('end')
    is_break = data.get('is_break')
    capacity_suggestion = data.get('capacity_suggestion')

    if not name:
        abort(400, description="No 'name' provided")

    new_timeslot = Timeslot(name=name, start=start, end=end, is_break=is_break, capacity_suggestion=capacity_suggestion)
    db.session.add(new_timeslot)
    db.session.commit()

    return jsonify({
        'message': 'New timeslot has been successfully added',
        'timeslot': new_timeslot.to_dict()
    })

@bp.route('/timeslots/<int:timeslot_id>', methods=['PATCH'])
@api_route
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
@api_route
def archive_timeslot(timeslot_id):
        timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
        timeslot.archive()
        db.session.commit()

        return jsonify({'message': 'The timeslot has been successfully archived'})


@bp.route('/timeslots/<int:timeslot_id>/activate', methods=['POST'])
@api_route
def activate_timeslot(timeslot_id):
    timeslot = Timeslot.query.filter_by(id=timeslot_id).first_or_404()
    timeslot.activate()
    db.session.commit()

    return jsonify({'message': 'The timeslot has been successfully activated'})


#------------------------------------------ DIFFICULTY LEVEL ------------------------------------------#

@bp.route('/difficulty_levels', methods=['GET'])
@api_route
def get_difficulty_levels():
    data = helper.filter_model_by_query_and_properties(DifficultyLevel, request.args)
    return jsonify(data)

@bp.route('/difficulty_levels/<int:difficulty_id>', methods=['GET'])
@api_route
def get_difficulty_level(difficulty_id):
    difficulty = DifficultyLevel.query.filter_by(id=difficulty_id).first_or_404()
    return jsonify(difficulty.to_dict())

#------------------------------------------ WORKSHOP TYPE ------------------------------------------#

@bp.route('/workshop_types', methods=['GET'])
@api_route
def get_workshop_types():
    data = helper.filter_model_by_query_and_properties(WorkshopType, request.args)
    return jsonify(data)

