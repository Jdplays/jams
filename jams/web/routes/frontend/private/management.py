# Frontend is just for serving pages
from urllib.parse import urlsplit

from flask import Blueprint, abort, render_template, request, url_for
from flask_security import login_required

from common.models import (
    Workshop,
    WorkshopFile,
    Event,
    Inventory,
    InventoryItem,
    InventoryContainer,
    InventoryAsset,
)

from web.util.decorators import role_based_access_control_fe

url_prefix = '/private/management'

bp = Blueprint('management', __name__, url_prefix='management')

# URL PREFIX = /private/management

# Workshops

@bp.route('/workshops')
@login_required
@role_based_access_control_fe
def workshops():
    return render_template(f'{url_prefix}/workshops/workshops.html')

@bp.route('/workshops/add')
@login_required
@role_based_access_control_fe
def add_workshop():
    return render_template(f'{url_prefix}/workshops/add_workshop.html')

@bp.route('/workshops/<int:workshop_id>/edit')
@login_required
@role_based_access_control_fe
def edit_workshop(workshop_id):
    Workshop.query.filter_by(id=workshop_id).first_or_404() # Make sure the workshop exists before rendering the template
    return render_template(f'{url_prefix}/workshops/edit_workshop.html')

@bp.route('/workshops/<int:workshop_id>/files/<string:file_uuid>/edit')
@login_required
@role_based_access_control_fe
def edit_workshop_file(workshop_id, file_uuid):
    # Check that the workshop file exists
    workshop_file = WorkshopFile.query.filter_by(file_id=file_uuid).first_or_404()
    if workshop_file.workshop_id != workshop_id:
        abort(400, description='Workshop file does not belong to requested workshop')
    return render_template(f'{url_prefix}/workshops/edit_workshop_file.html')

@bp.route('/locations_timeslots')
@login_required
@role_based_access_control_fe
def locations_timeslots():
    return render_template(f'{url_prefix}/locations_timeslots.html')

# Events
@bp.route('/events')
@login_required
@role_based_access_control_fe
def events():
    return render_template(f'{url_prefix}/events/events.html')

@bp.route('/events/add')
@login_required
@role_based_access_control_fe
def add_event():
    return render_template(f'{url_prefix}/events/add_event.html')

@bp.route('/events/<int:event_id>/edit')
@login_required
@role_based_access_control_fe
def edit_event(event_id):
    Event.query.filter_by(id=event_id).first_or_404() # Make sure the event exists before rendering the template
    return render_template(f'{url_prefix}/events/edit_event.html')

# ----- Inventory -----
def get_inventory_return_to(default_endpoint):
    fallback = url_for(default_endpoint)
    candidate = request.args.get('return_to', '')
    parsed = urlsplit(candidate)
    inventory_prefix = '/private/management/inventory'

    if parsed.scheme or parsed.netloc:
        return fallback

    if (
        parsed.path != inventory_prefix
        and not parsed.path.startswith(f'{inventory_prefix}/')
    ):
        return fallback

    return candidate


@bp.route('/inventory')
@login_required
@role_based_access_control_fe
def inventory():
    return render_template(f'{url_prefix}/inventory/inventory.html')


@bp.route('/inventory/items')
@login_required
@role_based_access_control_fe
def inventory_items():
    return render_template(f'{url_prefix}/inventory/items.html')


@bp.route('/inventory/items/add')
@login_required
@role_based_access_control_fe
def add_inventory_item():
    return render_template(
        f'{url_prefix}/inventory/item_form.html',
        item_id=None,
        return_to=get_inventory_return_to(
            'routes.frontend.private.management.inventory_items'
        ),
    )


@bp.route('/inventory/items/<int:item_id>/edit')
@login_required
@role_based_access_control_fe
def edit_inventory_item(item_id):
    InventoryItem.query.filter_by(id=item_id).first_or_404()
    return render_template(
        f'{url_prefix}/inventory/item_form.html',
        item_id=item_id,
        return_to=get_inventory_return_to(
            'routes.frontend.private.management.inventory_items'
        ),
    )


@bp.route('/inventory/containers')
@login_required
@role_based_access_control_fe
def inventory_containers():
    return render_template(f'{url_prefix}/inventory/containers.html')


@bp.route('/inventory/containers/add')
@login_required
@role_based_access_control_fe
def add_inventory_container():
    return render_template(
        f'{url_prefix}/inventory/container_form.html',
        container_id=None,
        return_to=get_inventory_return_to(
            'routes.frontend.private.management.inventory_containers'
        ),
    )


@bp.route('/inventory/containers/<int:container_id>/edit')
@login_required
@role_based_access_control_fe
def edit_inventory_container(container_id):
    InventoryContainer.query.filter_by(id=container_id).first_or_404()
    return render_template(
        f'{url_prefix}/inventory/container_form.html',
        container_id=container_id,
        return_to=get_inventory_return_to(
            'routes.frontend.private.management.inventory_containers'
        ),
    )


@bp.route('/inventory/assets')
@login_required
@role_based_access_control_fe
def inventory_assets():
    return render_template(f'{url_prefix}/inventory/assets.html')


@bp.route('/inventory/assets/<int:asset_id>')
@login_required
@role_based_access_control_fe
def inventory_asset_detail(asset_id):
    InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    return render_template(
        f'{url_prefix}/inventory/asset_detail.html',
        asset_id=asset_id,
        return_to=get_inventory_return_to(
            'routes.frontend.private.management.inventory_assets'
        ),
    )


@bp.route('/inventory/<int:inventory_id>')
@login_required
@role_based_access_control_fe
def inventory_detail(inventory_id):
    Inventory.query.filter_by(id=inventory_id).first_or_404()
    return render_template(
        f'{url_prefix}/inventory/inventory_detail.html',
        inventory_id=inventory_id
    )
