# API is for serving data to TypeScript/JavaScript
from datetime import UTC, date as date_type, datetime, timedelta
import re

from flask import Blueprint, request, jsonify, abort
from flask_security import current_user
from sqlalchemy.exc import IntegrityError

from common.models import (
    db,
    Inventory,
    InventoryItem,
    InventoryItemEntry,
    InventoryContainer,
    InventoryAsset,
    InventoryAssetEntry,
    InventoryAssetLog,
    User,
)
from common.extensions import get_logger
from common.configuration import ConfigType, get_config_value
from common.util.enums import InventoryAssetState, InventoryItemType
from common.redis.keys import RedisChannels
from common.redis.utils import publish_inventory_update

from web.util.decorators import api_route
from web.util import helper
from web.util.sse import redis_sse_stream

logger = get_logger('web')

bp = Blueprint('inventory', __name__)

# URL PREFIX = /api/v1


def serialize_inventory_entry(entry):
    data = entry.to_dict()
    data["item"] = entry.inventory_item.to_dict() if entry.inventory_item else None
    data["container"] = entry.container.to_dict() if entry.container else None
    data["inventory"] = entry.inventory.to_dict() if entry.inventory else None
    return data


def require_inventory_unlocked(inventory):
    if inventory.locked:
        abort(
            409,
            description=(
                "This inventory is locked and cannot be changed. "
                "Unlock it before making changes."
            )
        )


def require_asset_inventory_unlocked(asset):
    entry = asset.current_inventory_item_entry
    if entry:
        require_inventory_unlocked(entry.inventory)


def current_user_id():
    return current_user.id if current_user.is_authenticated else None


def publish_entry_update(entry, previous_container_id=None):
    container_ids = [
        container_id
        for container_id in {entry.container_id, previous_container_id}
        if container_id is not None
    ]
    publish_inventory_update(
        inventory_ids=[entry.inventory_id],
        container_ids=container_ids
    )


def inventory_update_matches(payload, inventory_id):
    return (
        payload.get('refresh_all') is True
        or inventory_id in payload.get('inventory_ids', [])
    )


def container_update_matches(payload, container_id):
    return (
        payload.get('refresh_all') is True
        or container_id in payload.get('container_ids', [])
    )


def get_asset_label_contact(entry=None):
    inventory = entry.inventory if entry else None
    return get_inventory_label_contact(inventory)


def get_inventory_label_contact(inventory):
    coordinator = inventory.user if inventory else None
    contact_email = get_config_value(ConfigType.ASSET_LABEL_CONTACT_EMAIL)

    if not coordinator:
        abort(409, description="The inventory has no coordinator for the asset label")

    if not contact_email:
        abort(409, description="Asset label contact email is not configured")

    return coordinator.display_name, contact_email


def get_recently_printed_assets(assets, hours):
    recent_cutoff = (
        datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=hours)
    )
    return [
        asset for asset in assets
        if asset.last_printed_at and asset.last_printed_at >= recent_cutoff
    ]


def build_asset_label_print_preview(assets, recent_hours=1):
    assets = list(assets)
    recently_printed = get_recently_printed_assets(assets, recent_hours)

    from common.integrations import jolt
    queued_codes = jolt.get_active_asset_label_codes(assets)

    return {
        'total_count': len(assets),
        'recent_count': len(recently_printed),
        'recent_asset_codes': sorted(
            asset.asset_code for asset in recently_printed
        ),
        'queued_count': len(queued_codes),
        'queued_asset_codes': sorted(queued_codes),
    }


def queue_asset_labels(
    assets,
    entry=None,
    recent_mode='reject',
    recent_hours=24
):
    assets = list({asset.id: asset for asset in assets}.values())

    if not get_config_value(ConfigType.JOLT_ENABLED):
        abort(409, description="JOLT integration is not enabled")

    if recent_mode not in {'reject', 'skip', 'include'}:
        abort(400, description="recent_mode must be reject, skip or include")

    recently_printed = get_recently_printed_assets(assets, recent_hours)
    if recently_printed and recent_mode == 'reject':
        abort(
            409,
            description=(
                "Recently printed labels require confirmation: "
                + ", ".join(asset.asset_code for asset in recently_printed)
            )
        )

    assets_to_print = (
        [asset for asset in assets if asset not in recently_printed]
        if recent_mode == 'skip'
        else assets
    )
    if not assets_to_print:
        return jsonify({
            'message': 'No labels were queued; all were recently printed',
            'data': {
                'requested_count': len(assets),
                'queued_count': 0,
                'already_queued_count': 0,
                'already_queued_asset_codes': [],
                'recently_printed_count': len(recently_printed),
                'skipped_recent_count': len(recently_printed),
            }
        })

    contact_name, contact_email = get_asset_label_contact(entry)

    from common.integrations import jolt
    status, message, queued_assets, already_queued_codes = (
        jolt.add_assets_to_print_queue(
            assets_to_print,
            contact_name,
            contact_email
        )
    )

    if status:
        for asset in queued_assets:
            add_asset_log(
                asset,
                message="Asset label queued for printing",
                state=asset.status
            )
        db.session.commit()

    return jsonify({
        'message': message,
        'data': {
            'requested_count': len(assets),
            'queued_count': len(queued_assets) if status else 0,
            'already_queued_count': len(already_queued_codes),
            'already_queued_asset_codes': already_queued_codes,
            'recently_printed_count': len(recently_printed),
            'skipped_recent_count': (
                len(recently_printed) if recent_mode == 'skip' else 0
            ),
        }
    }), 200 if status else 400


def add_asset_log(asset, message=None, state=None, note=None):
    if state is not None:
        state = validate_asset_state(state)
    log = InventoryAssetLog(
        inventory_asset_id=asset.id,
        message=message,
        state=state,
        note=note,
        user_id=current_user_id()
    )
    db.session.add(log)
    return log


def link_asset_to_entry(asset, entry, message=None):
    require_inventory_unlocked(entry.inventory)
    db.session.add(InventoryAssetEntry(
        inventory_asset_id=asset.id,
        inventory_item_entry_id=entry.id
    ))
    add_asset_log(
        asset,
        message=message or f"Added to inventory {entry.inventory.name}",
        state=asset.status
    )


def move_asset_to_entry(asset, entry):
    current_entry = asset.current_inventory_item_entry
    require_inventory_unlocked(entry.inventory)
    if current_entry:
        require_inventory_unlocked(current_entry.inventory)
    if current_entry and current_entry.id == entry.id:
        abort(409, description="Asset is already assigned to this inventory entry")

    # Within one inventory an asset can only belong to one active entry. Remove
    # the previous link so entry counts and container membership stay aligned.
    # Links to older inventories remain as history.
    if current_entry and current_entry.inventory_id == entry.inventory_id:
        current_links = InventoryAssetEntry.query.filter_by(
            inventory_asset_id=asset.id,
            inventory_item_entry_id=current_entry.id
        ).all()
        for link in current_links:
            db.session.delete(link)

        if current_entry.quantity > 0:
            current_entry.quantity -= 1
        if current_entry.quantity == 0 and not current_entry.removed:
            current_entry.remove()

    if asset.id not in {linked_asset.id for linked_asset in entry.assets}:
        entry.quantity += 1

    link_asset_to_entry(
        asset,
        entry,
        message=f"Moved to inventory {entry.inventory.name}"
    )


def archive_asset_if_unassigned(asset, excluding_entry_id=None):
    query = (
        InventoryAssetEntry.query
        .join(InventoryItemEntry)
        .filter(
            InventoryAssetEntry.inventory_asset_id == asset.id,
            InventoryItemEntry.removed.is_(False)
        )
    )
    if excluding_entry_id is not None:
        query = query.filter(
            InventoryAssetEntry.inventory_item_entry_id != excluding_entry_id
        )

    if query.first() or asset.status == InventoryAssetState.ARCHIVED.name:
        return False

    asset.archive(reason="No longer assigned to an inventory")
    add_asset_log(
        asset,
        message="Asset archived after its final inventory assignment was removed",
        state=InventoryAssetState.ARCHIVED.name
    )
    return True


def remove_asset_from_entry(asset, entry, message=None, note=None):
    require_inventory_unlocked(entry.inventory)
    links = (
        InventoryAssetEntry.query
        .filter_by(
            inventory_asset_id=asset.id,
            inventory_item_entry_id=entry.id
        )
        .order_by(InventoryAssetEntry.id.desc())
        .all()
    )
    if not links:
        abort(404, description="Asset is not linked to this inventory entry")

    for link in links:
        db.session.delete(link)

    if entry.quantity > 0:
        entry.quantity -= 1
    if entry.quantity <= 0 and not entry.removed:
        entry.remove()

    add_asset_log(
        asset,
        message=message or f"Removed from inventory {entry.inventory.name}",
        state=asset.status,
        note=note
    )

    archive_asset_if_unassigned(asset, excluding_entry_id=entry.id)


def get_request_json_object():
    data = request.get_json(silent=True)
    if data is None:
        return {}
    if not isinstance(data, dict):
        abort(400, description="Request body must be a JSON object")
    return data


VALID_INVENTORY_ITEM_TYPES = {item_type.name for item_type in InventoryItemType}
VALID_INVENTORY_ASSET_STATES = {
    asset_state.name for asset_state in InventoryAssetState
}
ASSET_CODE_PREFIX_PATTERN = re.compile(r"^[A-Z0-9]{3}$")
MAX_CONTAINER_DESCRIPTION_LENGTH = 1000
MAX_ASSET_NOTE_LENGTH = 2000


def validate_asset_state(value):
    if not isinstance(value, str) or value not in VALID_INVENTORY_ASSET_STATES:
        abort(
            400,
            description=(
                "state must be one of: "
                f"{', '.join(sorted(VALID_INVENTORY_ASSET_STATES))}"
            )
        )
    return value


def set_asset_state(asset, state, note=None):
    state = validate_asset_state(state)
    note = validate_optional_string(note, "note", MAX_ASSET_NOTE_LENGTH)

    if asset.status == state:
        abort(409, description=f"Asset is already {state.lower()}")
    if (
        asset.status == InventoryAssetState.ARCHIVED.name
        and state == InventoryAssetState.BROKEN.name
    ):
        abort(409, description="Activate the asset before marking it broken")

    if state == InventoryAssetState.BROKEN.name:
        if not note or not note.strip():
            abort(400, description="A note is required when marking an asset broken")
        asset.mark_broken()
        message = "Asset marked as broken"
    elif state == InventoryAssetState.ARCHIVED.name:
        asset.archive(reason=note)
        message = "Asset archived"
    else:
        message = (
            "Asset marked as fixed"
            if asset.status == InventoryAssetState.BROKEN.name
            else "Asset activated"
        )
        asset.activate()

    if state == InventoryAssetState.ACTIVE.name:
        asset.notes = note
    elif note is not None:
        asset.notes = note
    add_asset_log(asset, message=message, state=state, note=note)


def validate_inventory_item_configuration(data, item=None):
    item_type = data.get(
        "type",
        item.type if item else InventoryItemType.PHYSICAL.name
    )
    if not isinstance(item_type, str) or item_type not in VALID_INVENTORY_ITEM_TYPES:
        abort(
            400,
            description=(
                "type must be one of: "
                f"{', '.join(sorted(VALID_INVENTORY_ITEM_TYPES))}"
            )
        )

    is_asset = data.get("is_asset", item.is_asset if item else False)
    if not isinstance(is_asset, bool):
        abort(400, description="is_asset must be true or false")

    needs_label = data.get(
        "needs_label",
        item.needs_label if item else False
    )
    if not isinstance(needs_label, bool):
        abort(400, description="needs_label must be true or false")
    if needs_label and not is_asset:
        abort(400, description="Only asset-tracked items can require labels")
    if not is_asset:
        needs_label = False

    prefix = data.get(
        "asset_code_prefix",
        item.asset_code_prefix if item else None
    )

    if is_asset:
        if item_type != InventoryItemType.PHYSICAL.name:
            abort(400, description="Only physical items can be asset tracked")

        if not isinstance(prefix, str) or not prefix.strip():
            abort(400, description="asset_code_prefix is required for asset items")

        prefix = prefix.strip().upper()
        if not ASSET_CODE_PREFIX_PATTERN.fullmatch(prefix):
            abort(
                400,
                description=(
                    "asset_code_prefix must contain exactly 3 uppercase "
                    "letters or numbers"
                )
            )

        duplicate_prefix = InventoryItem.query.filter_by(
            asset_code_prefix=prefix
        )
        if item is not None:
            duplicate_prefix = duplicate_prefix.filter(InventoryItem.id != item.id)
        if duplicate_prefix.first():
            abort(409, description="asset_code_prefix is already in use")
    else:
        prefix = None

    if item is not None and item.is_asset and item.assets:
        if not is_asset:
            abort(409, description="Asset tracking cannot be disabled after assets exist")
        if prefix != item.asset_code_prefix:
            abort(409, description="Asset code prefix cannot change after assets exist")

    return item_type, is_asset, prefix, needs_label


def commit_inventory_item(asset_code_prefix, item_id=None):
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()

        duplicate_prefix = InventoryItem.query.filter_by(
            asset_code_prefix=asset_code_prefix
        )
        if item_id is not None:
            duplicate_prefix = duplicate_prefix.filter(
                InventoryItem.id != item_id
            )
        if asset_code_prefix and duplicate_prefix.first():
            abort(409, description="asset_code_prefix is already in use")
        raise


def validate_asset_label(item, value):
    if value is None:
        if item.needs_label:
            abort(400, description="label is required for this asset item")
        return None
    if not isinstance(value, str):
        abort(400, description="label must be a string or null")
    value = value.strip()
    if not value:
        if item.needs_label:
            abort(400, description="label is required for this asset item")
        return None
    if len(value) > 255:
        abort(400, description="label must be 255 characters or fewer")
    return value


def validate_new_asset_labels(item, data, quantity):
    labels = data.get("asset_labels")
    if not item.needs_label:
        if labels not in (None, []):
            abort(400, description="asset_labels can only be used for items that need labels")
        return None

    if not isinstance(labels, list) or len(labels) != quantity:
        abort(
            400,
            description=f"asset_labels must contain one label for each of the {quantity} assets"
        )
    return [validate_asset_label(item, label) for label in labels]


def validate_item_name(value):
    if not isinstance(value, str) or not value.strip():
        abort(400, description="name is required")
    if len(value.strip()) > 128:
        abort(400, description="name must be 128 characters or fewer")
    return value.strip()


def validate_integer_id(value, field, required=True):
    if value is None and not required:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        abort(400, description=f"{field} must be an integer")
    return value


def validate_optional_string(value, field, max_length=None):
    if value is None:
        return None
    if not isinstance(value, str):
        abort(400, description=f"{field} must be a string or null")
    if max_length is not None and len(value) > max_length:
        abort(
            400,
            description=f"{field} must be {max_length} characters or fewer"
        )
    return value


def validate_container_parent(parent_container_id, container=None):
    parent_container_id = validate_integer_id(
        parent_container_id,
        "parent_container_id",
        required=False
    )
    if parent_container_id is None:
        return None

    if container is not None and parent_container_id == container.id:
        abort(400, description="container cannot be its own parent")

    parent = InventoryContainer.query.filter_by(
        id=parent_container_id,
        archived=False
    ).first_or_404()

    ancestor = parent
    visited_ids = set()
    while ancestor is not None:
        if ancestor.id in visited_ids:
            abort(409, description="Existing container hierarchy contains a cycle")
        visited_ids.add(ancestor.id)
        if container is not None and ancestor.id == container.id:
            abort(400, description="container hierarchy cannot contain a cycle")
        ancestor = ancestor.parent_container

    return parent.id


def fetch_inventory_detail(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    current_inventory = Inventory.current()
    entries = (
        InventoryItemEntry.query
        .filter_by(inventory_id=inventory_id, removed=False)
        .order_by(InventoryItemEntry.id.asc())
        .all()
    )

    return {
        "inventory": inventory.to_dict(),
        "status": (
            "Archived"
            if not inventory.active
            else "Active"
            if current_inventory and current_inventory.id == inventory.id
            else "Old"
        ),
        "summary": {
            "entry_count": len(entries),
            "total_count": sum(entry.quantity for entry in entries),
            "asset_count": sum(len(entry.assets) for entry in entries)
        },
        "entries": [serialize_inventory_entry(entry) for entry in entries]
    }

#------------------------------------------ INVENTORY ------------------------------------------#

@bp.route('/inventory', methods=['GET'])
@api_route
def get_inventories():
    data = helper.filter_model_by_query_and_properties(Inventory, request.args)
    return jsonify(data)


@bp.route('/inventory/<string:field>', methods=['GET'])
@api_route
def get_inventories_field(field):
    data = helper.filter_model_by_query_and_properties(Inventory, request.args, field)
    return jsonify(data)

@bp.route('/inventory/<int:inventory_id>', methods=['GET'])
@api_route
def get_inventory(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    return jsonify(inventory.to_dict())

@bp.route('/inventory/<int:inventory_id>/summary', methods=['GET'])
@api_route
def get_inventory_summary(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    entries = [entry for entry in inventory.entries if not entry.removed]
    entry_count = len(entries)
    total_count = sum(entry.quantity for entry in entries)
    asset_count = sum(len(entry.assets) for entry in entries)

    return jsonify({
        "data": {
            "entry_count": entry_count,
            "total_count": total_count,
            "asset_count": asset_count
        }
    })


@bp.route('/inventory/<int:inventory_id>/detail', methods=['GET'])
@api_route
def get_inventory_detail(inventory_id):
    return jsonify({"data": fetch_inventory_detail(inventory_id)})


@bp.route('/inventory/<int:inventory_id>/entries/stream', methods=['GET'])
@api_route
def get_inventory_entries_sse(inventory_id):
    Inventory.query.filter_by(id=inventory_id).first_or_404()
    return redis_sse_stream(
        lambda: fetch_inventory_detail(inventory_id),
        RedisChannels.INVENTORY_UPDATE,
        should_refresh=lambda payload: inventory_update_matches(
            payload,
            inventory_id
        )
    )


@bp.route('/inventory/<int:inventory_id>/<string:field>', methods=['GET'])
@api_route
def get_inventory_field(inventory_id, field):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    allowed_fields = list(inventory.to_dict().keys())
    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")
    value = getattr(inventory, field)
    if field == 'date':
        value = helper.convert_datetime_to_local_timezone(value)
    
    return jsonify({field: str(value)})


@bp.route('/inventory', methods=['POST'])
@api_route
def add_inventory():
    data = get_request_json_object()

    name = validate_item_name(data.get('name'))
    inventory_date = data.get('date')
    coordinator_id = data.get('coordinator_id')

    if inventory_date is None:
        inventory_date = datetime.now(UTC).date()
    elif isinstance(inventory_date, str):
        try:
            inventory_date = date_type.fromisoformat(inventory_date)
        except ValueError:
            abort(400, description="date must be in YYYY-MM-DD format")
    elif not isinstance(inventory_date, date_type):
        abort(400, description="date must be in YYYY-MM-DD format")

    coordinator_id = validate_integer_id(
        coordinator_id,
        "coordinator_id",
        required=False
    )
    if coordinator_id is not None:
        User.query.filter_by(id=coordinator_id).first_or_404()

    new_inventory = Inventory(
        name=name,
        date=inventory_date,
        coordinator_id=coordinator_id
    )
    db.session.add(new_inventory)
    db.session.commit()
    publish_inventory_update(inventory_ids=[new_inventory.id])

    return jsonify({
        'message': 'New inventory has been successfully added',
        'role': new_inventory.to_dict()
    })


@bp.route('/inventory/<int:inventory_id>', methods=['PATCH'])
@api_route
def edit_inventory(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    require_inventory_unlocked(inventory)
    data = get_request_json_object()

    if "name" in data:
        inventory.name = validate_item_name(data["name"])

    if "date" in data:
        try:
            inventory.date = date_type.fromisoformat(data["date"])
        except (TypeError, ValueError):
            abort(400, description="date must be in YYYY-MM-DD format")

    if "coordinator_id" in data:
        coordinator_id = validate_integer_id(
            data["coordinator_id"],
            "coordinator_id",
            required=False
        )
        if coordinator_id is not None:
            User.query.filter_by(id=coordinator_id).first_or_404()
        inventory.coordinator_id = coordinator_id

    if "active" in data:
        if not isinstance(data["active"], bool):
            abort(400, description="active must be true or false")
        inventory.active = data["active"]
    
    db.session.commit()
    publish_inventory_update(inventory_ids=[inventory.id])

    return jsonify({
        'message': 'Inventory has be updated successfully',
        'user': inventory.to_dict()
    })

@bp.route('/inventory/<int:inventory_id>/archive', methods=['POST'])
@api_route
def archive_inventory(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    require_inventory_unlocked(inventory)
    inventory.archive()
    db.session.commit()
    publish_inventory_update(inventory_ids=[inventory.id])

    return jsonify({'message': 'The inventory has been successfully archived'})


@bp.route('/inventory/<int:inventory_id>/activate', methods=['POST'])
@api_route
def activate_inventory(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    require_inventory_unlocked(inventory)
    inventory.activate()
    db.session.commit()
    publish_inventory_update(inventory_ids=[inventory.id])

    return jsonify({'message': 'The inventory has been successfully activated'})


@bp.route('/inventory/<int:inventory_id>/lock', methods=['POST'])
@api_route
def lock_inventory(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    if inventory.locked:
        abort(409, description="The inventory is already locked")

    inventory.lock()
    db.session.commit()
    publish_inventory_update(inventory_ids=[inventory.id])
    return jsonify({
        'message': 'The inventory has been locked',
        'data': inventory.to_dict(),
    })


@bp.route('/inventory/<int:inventory_id>/unlock', methods=['POST'])
@api_route
def unlock_inventory(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    if not inventory.locked:
        abort(409, description="The inventory is already unlocked")

    inventory.unlock()
    db.session.commit()
    publish_inventory_update(inventory_ids=[inventory.id])
    return jsonify({
        'message': 'The inventory has been unlocked',
        'data': inventory.to_dict(),
    })


#------------------------------------------ ITEM ------------------------------------------#

@bp.route('/inventory/items', methods=['GET'])
@api_route
def get_inventory_items():
    data = helper.filter_model_by_query_and_properties(InventoryItem, request.args)
    return jsonify(data)


@bp.route('/inventory/items/<string:field>', methods=['GET'])
@api_route
def get_inventory_items_field(field):
    data = helper.filter_model_by_query_and_properties(InventoryItem, request.args, field)
    return jsonify(data)

@bp.route('/inventory/items/<int:item_id>', methods=['GET'])
@api_route
def get_inventory_item(item_id):
    item = InventoryItem.query.filter_by(id=item_id).first_or_404()
    return jsonify(item.to_dict())


@bp.route('/inventory/items/<int:item_id>/<string:field>', methods=['GET'])
@api_route
def get_inventory_item_field(item_id, field):
    item = InventoryItem.query.filter_by(id=item_id).first_or_404()
    item_data = item.to_dict()
    if field not in item_data:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: item_data[field]})


@bp.route('/inventory/items/validate-asset-code-prefix', methods=['GET'])
@api_route
def validate_inventory_item_asset_code_prefix():
    prefix = request.args.get('value', '').strip().upper()
    exclude_item_id = request.args.get('exclude_item_id', type=int)

    if not ASSET_CODE_PREFIX_PATTERN.fullmatch(prefix):
        return jsonify({
            'valid': False,
            'available': False,
            'normalized': prefix,
            'message': 'Use exactly 3 uppercase letters or numbers'
        })

    duplicate_prefix = InventoryItem.query.filter_by(
        asset_code_prefix=prefix
    )
    if exclude_item_id is not None:
        duplicate_prefix = duplicate_prefix.filter(
            InventoryItem.id != exclude_item_id
        )

    available = duplicate_prefix.first() is None
    return jsonify({
        'valid': True,
        'available': available,
        'normalized': prefix,
        'message': (
            'Asset code prefix is available'
            if available
            else 'Asset code prefix is already in use'
        )
    })

@bp.route('/inventory/items', methods=['POST'])
@api_route
def create_inventory_item():
    data = get_request_json_object()

    name = validate_item_name(data.get('name'))
    description = data.get('description')
    attribute_schema = data.get('attribute_schema')

    if description is not None and not isinstance(description, str):
        abort(400, description="description must be a string or null")
    if description is not None and len(description) > 512:
        abort(400, description="description must be 512 characters or fewer")

    item_type, is_asset, asset_code_prefix, needs_label = (
        validate_inventory_item_configuration(data)
    )

    attribute_schema = helper.validate_attribute_schema(attribute_schema)

    item = InventoryItem(
        name=name,
        description=description,
        type=item_type,
        is_asset=is_asset,
        asset_code_prefix=asset_code_prefix,
        needs_label=needs_label,
        attribute_schema=attribute_schema
    )

    db.session.add(item)
    commit_inventory_item(asset_code_prefix)
    publish_inventory_update(refresh_all=True)

    return jsonify(item.to_dict()), 201

@bp.route('/inventory/items/<int:item_id>', methods=['PATCH', 'PUT'])
@api_route
def update_inventory_item(item_id):
    item = InventoryItem.query.filter_by(id=item_id).first_or_404()
    data = get_request_json_object()

    item_type, is_asset, asset_code_prefix, needs_label = (
        validate_inventory_item_configuration(data, item)
    )

    if "name" in data:
        item.name = validate_item_name(data["name"])

    if "description" in data:
        if data["description"] is not None and not isinstance(data["description"], str):
            abort(400, description="description must be a string or null")
        if data["description"] is not None and len(data["description"]) > 512:
            abort(400, description="description must be 512 characters or fewer")
        item.description = data["description"]

    item.type = item_type
    item.is_asset = is_asset
    item.asset_code_prefix = asset_code_prefix
    item.needs_label = needs_label

    if "attribute_schema" in data:
        new_schema = helper.validate_attribute_schema(data["attribute_schema"])

        used = helper.get_used_attributes_for_item(item.id)

        new_schema = helper.merge_schema_with_used_old_values(
            old_schema=item.attribute_schema,
            new_schema=new_schema,
            used=used
        )

        item.attribute_schema = new_schema

    commit_inventory_item(asset_code_prefix, item.id)
    publish_inventory_update(refresh_all=True)

    return jsonify(item.to_dict())

@bp.route('/inventory/items/<int:item_id>/archive', methods=['POST'])
@api_route
def archive_inventory_item(item_id):
    item = InventoryItem.query.filter_by(id=item_id).first_or_404()
    item.archive()
    db.session.commit()
    publish_inventory_update(refresh_all=True)

    return jsonify({'message': 'The item has been successfully archived'})


@bp.route('/inventory/items/<int:item_id>/activate', methods=['POST'])
@api_route
def activate_inventory_item(item_id):
    item = InventoryItem.query.filter_by(id=item_id).first_or_404()
    item.activate()
    db.session.commit()
    publish_inventory_update(refresh_all=True)

    return jsonify({'message': 'The item has been successfully activated'})


#------------------------------------------ ITEM ENTRY ------------------------------------------#

@bp.route('/inventory/entry', methods=['GET'])
@api_route
def get_inventory_entries():
    data = helper.filter_model_by_query_and_properties(InventoryItemEntry, request.args)
    return jsonify(data)


@bp.route('/inventory/entry/<string:field>', methods=['GET'])
@api_route
def get_inventory_entries_field(field):
    data = helper.filter_model_by_query_and_properties(InventoryItemEntry, request.args, field)
    return jsonify(data)

@bp.route('/inventory/entry/<int:entry_id>', methods=['GET'])
@api_route
def get_inventory_entry(entry_id):
    entry = InventoryItemEntry.query.filter_by(id=entry_id).first_or_404()
    return jsonify(entry.to_dict())


@bp.route('/inventory/entry/<int:entry_id>/<string:field>', methods=['GET'])
@api_route
def get_inventory_entry_field(entry_id, field):
    entry = InventoryItemEntry.query.filter_by(id=entry_id).first_or_404()
    entry_data = entry.to_dict()
    if field not in entry_data:
        abort(404, description=f"Field '{field}' not found or allowed")

    return jsonify({field: entry_data[field]})


MAX_INVENTORY_QUANTITY = 500
MAX_ASSET_START_INDEX = 999999999


def parse_inventory_quantity(value, maximum=MAX_INVENTORY_QUANTITY, field="quantity"):
    if isinstance(value, bool):
        abort(400, description=f"{field} must be an integer")

    try:
        quantity = int(value)
    except (TypeError, ValueError):
        abort(400, description=f"{field} must be an integer")

    if quantity <= 0:
        abort(400, description=f"{field} must be greater than 0")

    if maximum is not None and quantity > maximum:
        abort(400, description=f"{field} cannot exceed {maximum}")

    return quantity


def next_asset_code_index(item):
    prefix = f"{item.asset_code_prefix}-"
    pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$")
    highest_index = 0

    asset_codes = (
        InventoryAsset.query
        .with_entities(InventoryAsset.asset_code)
        .filter_by(inventory_item_id=item.id)
        .all()
    )
    for asset_code, in asset_codes:
        match = pattern.fullmatch(asset_code)
        if match:
            highest_index = max(highest_index, int(match.group(1)))

    return highest_index + 1


def normalise_requested_asset_code(item, value):
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        abort(400, description="Each asset code must be a string or integer")
    text = str(value).strip().upper()
    if len(text) > 100:
        abort(400, description="Each asset code must be 100 characters or fewer")
    if text.isdigit():
        return f"{item.asset_code_prefix}-{int(text):03d}"

    pattern = re.compile(
        rf"^{re.escape(item.asset_code_prefix)}-(\d+)$"
    )
    match = pattern.fullmatch(text)
    if not match:
        abort(
            400,
            description=(
                f"Asset '{text}' must be a number or use the "
                f"{item.asset_code_prefix}-xxx format"
            )
        )
    return f"{item.asset_code_prefix}-{int(match.group(1)):03d}"


def build_requested_existing_asset_codes(item, data):
    selection_mode = data.get("existing_asset_selection")
    if selection_mode not in {"codes", "range"}:
        abort(
            400,
            description="existing_asset_selection must be codes or range"
        )

    if selection_mode == "codes":
        requested_values = data.get("existing_asset_codes")
        if not isinstance(requested_values, list) or not requested_values:
            abort(400, description="existing_asset_codes must be a non-empty list")
        if len(requested_values) > MAX_INVENTORY_QUANTITY:
            abort(
                400,
                description=(
                    "existing_asset_codes cannot contain more than "
                    f"{MAX_INVENTORY_QUANTITY} assets"
                )
            )
        requested_codes = [
            normalise_requested_asset_code(item, value)
            for value in requested_values
        ]
        quantity = len(requested_codes)
    else:
        quantity = parse_inventory_quantity(data.get("quantity", 1))
        start_index = parse_inventory_quantity(
            data.get("asset_start_index"),
            maximum=MAX_ASSET_START_INDEX,
            field="asset_start_index"
        )
        requested_codes = [
            f"{item.asset_code_prefix}-{index:03d}"
            for index in range(start_index, start_index + quantity)
        ]

    return requested_codes, quantity


def validate_existing_assets_for_entry(inventory, item, attributes, data):
    requested_codes, quantity = build_requested_existing_asset_codes(item, data)

    duplicate_codes = sorted({
        code for code in requested_codes if requested_codes.count(code) > 1
    })
    result = {
        "valid": True,
        "quantity": quantity,
        "asset_codes": requested_codes,
        "invalid_assets": [],
        "assets": [],
    }

    for code in duplicate_codes:
        result["valid"] = False
        result["invalid_assets"].append({
            "asset_code": code,
            "reason": "Duplicate asset code in request",
            "code": "duplicate",
        })

    assets = InventoryAsset.query.filter(
        InventoryAsset.inventory_item_id == item.id,
        InventoryAsset.asset_code.in_(requested_codes)
    ).all()
    assets_by_code = {asset.asset_code: asset for asset in assets}

    for code in requested_codes:
        asset = assets_by_code.get(code)
        if not asset:
            result["valid"] = False
            result["invalid_assets"].append({
                "asset_code": code,
                "reason": "Asset does not exist",
                "code": "missing",
            })
            continue

        asset_valid = True
        if asset.archived or asset.status != InventoryAssetState.ACTIVE.name:
            asset_valid = False
            result["valid"] = False
            result["invalid_assets"].append({
                "asset_code": code,
                "reason": "Asset is not active",
                "code": "inactive",
            })

        if (asset.attributes or None) != (attributes or None):
            asset_valid = False
            result["valid"] = False
            result["invalid_assets"].append({
                "asset_code": code,
                "reason": "Asset has different attributes",
                "code": "attribute_mismatch",
            })

        existing_inventory_entry = next(
            (
                link.inventory_item_entry
                for link in getattr(asset, "entry_links", [])
                if (
                    link.inventory_item_entry
                    and not link.inventory_item_entry.removed
                    and link.inventory_item_entry.inventory_id == inventory.id
                )
            ),
            None
        )
        if existing_inventory_entry:
            asset_valid = False
            result["valid"] = False
            result["invalid_assets"].append({
                "asset_code": code,
                "reason": "Asset is already assigned to this inventory",
                "code": "already_in_inventory",
                "inventory_item_entry_id": existing_inventory_entry.id,
            })

        if asset_valid:
            result["assets"].append(asset)

    return result


def abort_for_invalid_asset_validation(validation):
    if validation["valid"]:
        return

    descriptions = [
        f"{item['asset_code']}: {item['reason']}"
        for item in validation["invalid_assets"]
    ]
    abort(409, description="; ".join(descriptions))


def resolve_entry_assets(inventory, item, attributes, data):
    if not item.is_asset:
        if data.get("asset_mode") not in (None, "create"):
            abort(400, description="Only asset-tracked items can select asset modes")
        if data.get("asset_labels") not in (None, []):
            abort(400, description="Only asset-tracked items can have asset labels")
        quantity = parse_inventory_quantity(data.get("quantity", 1))
        return quantity, None, True, []

    asset_mode = data.get("asset_mode", "create")
    if asset_mode not in {"create", "existing"}:
        abort(400, description="asset_mode must be create or existing")
    if asset_mode == "create":
        quantity = parse_inventory_quantity(data.get("quantity", 1))
        labels = validate_new_asset_labels(item, data, quantity)
        return quantity, None, True, labels

    if data.get("asset_labels") not in (None, []):
        abort(400, description="Labels are only supplied when creating new assets")

    validation = validate_existing_assets_for_entry(inventory, item, attributes, data)
    abort_for_invalid_asset_validation(validation)

    ordered_assets_by_code = {
        asset.asset_code: asset for asset in validation["assets"]
    }
    ordered_assets = [
        ordered_assets_by_code[code]
        for code in validation["asset_codes"]
    ]
    return len(ordered_assets), ordered_assets, False, []


def create_or_increment_inventory_entry(
    inventory,
    item,
    container,
    attributes,
    quantity,
    existing_assets=None,
    create_new_assets=True,
    asset_labels=None
):
    if item.is_asset and not item.asset_code_prefix:
        abort(409, description="Asset-tracked item has no asset code prefix")

    container_id = container.id if container else None
    entry = (
        InventoryItemEntry.query
        .filter(
            InventoryItemEntry.inventory_id == inventory.id,
            InventoryItemEntry.inventory_item_id == item.id,
            InventoryItemEntry.container_id == container_id,
            InventoryItemEntry.attributes == attributes,
            InventoryItemEntry.removed.is_(False)
        )
        .order_by(InventoryItemEntry.id.asc())
        .first()
    )

    created = entry is None
    if entry:
        entry.quantity += quantity
    else:
        entry = InventoryItemEntry(
            inventory_id=inventory.id,
            inventory_item_id=item.id,
            container_id=container_id,
            attributes=attributes,
            quantity=quantity
        )
        db.session.add(entry)
        db.session.flush()

    new_assets = []
    if item.is_asset and create_new_assets:
        first_index = next_asset_code_index(item)
        for offset, index in enumerate(range(first_index, first_index + quantity)):
            label = asset_labels[offset] if asset_labels else None
            asset = InventoryAsset(
                asset_code=f"{item.asset_code_prefix}-{index:03d}",
                inventory_item_id=item.id,
                label=label,
                attributes=attributes
            )
            db.session.add(asset)
            new_assets.append(asset)

        db.session.flush()
        for asset in new_assets:
            link_asset_to_entry(asset, entry)
    elif item.is_asset:
        for asset in existing_assets or []:
            link_asset_to_entry(asset, entry)

    return entry, created, new_assets


@bp.route('/inventory/entry', methods=['POST'])
@api_route
def create_inventory_entry():
    data = get_request_json_object()

    inventory_id = data.get('inventory_id')
    inventory_item_id = data.get('inventory_item_id')
    container_id = data.get('container_id')

    if inventory_id is None:
        abort(400, description="inventory_id is required")

    if inventory_item_id is None:
        abort(400, description="inventory_item_id is required")

    inventory_id = validate_integer_id(inventory_id, "inventory_id")
    inventory_item_id = validate_integer_id(
        inventory_item_id,
        "inventory_item_id"
    )
    container_id = validate_integer_id(
        container_id,
        "container_id",
        required=False
    )

    item = (
        InventoryItem.query
        .filter_by(id=inventory_item_id)
        .with_for_update()
        .first_or_404()
    )
    if item.archived:
        abort(409, description="Archived items cannot be added to an inventory")

    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    require_inventory_unlocked(inventory)

    container = None
    if container_id is not None:
        container = InventoryContainer.query.filter_by(
            id=container_id,
            archived=False
        ).first_or_404()

    attributes = helper.validate_entry_attributes(
        item,
        data.get('attributes')
    )

    quantity, existing_assets, create_new_assets, asset_labels = resolve_entry_assets(
        inventory,
        item,
        attributes,
        data
    )

    entry, created, new_assets = create_or_increment_inventory_entry(
        inventory=inventory,
        item=item,
        container=container,
        attributes=attributes,
        quantity=quantity,
        existing_assets=existing_assets,
        create_new_assets=create_new_assets,
        asset_labels=asset_labels
    )
    db.session.commit()
    publish_entry_update(entry)

    response = serialize_inventory_entry(entry)
    response['new_assets'] = [
        {
            'id': asset.id,
            'asset_code': asset.asset_code,
            'label': asset.label,
            'last_printed_at': None,
        }
        for asset in new_assets
    ]
    return jsonify(response), 201 if created else 200


@bp.route('/inventory/<int:inventory_id>/entries', methods=['POST'])
@api_route
def create_inventory_entry_for_inventory(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    require_inventory_unlocked(inventory)
    data = get_request_json_object()

    inventory_item_id = data.get("inventory_item_id")
    container_id = data.get("container_id")

    if inventory_item_id is None:
        abort(400, description="inventory_item_id is required")

    inventory_item_id = validate_integer_id(
        inventory_item_id,
        "inventory_item_id"
    )
    container_id = validate_integer_id(
        container_id,
        "container_id",
        required=False
    )

    item = (
        InventoryItem.query
        .filter_by(id=inventory_item_id)
        .with_for_update()
        .first_or_404()
    )
    if item.archived:
        abort(409, description="Archived items cannot be added to an inventory")

    container = None
    if container_id is not None:
        container = InventoryContainer.query.filter_by(
            id=container_id,
            archived=False
        ).first_or_404()

    attributes = helper.validate_entry_attributes(item, data.get("attributes"))
    quantity, existing_assets, create_new_assets, asset_labels = resolve_entry_assets(
        inventory,
        item,
        attributes,
        data
    )
    entry, created, new_assets = create_or_increment_inventory_entry(
        inventory=inventory,
        item=item,
        container=container,
        attributes=attributes,
        quantity=quantity,
        existing_assets=existing_assets,
        create_new_assets=create_new_assets,
        asset_labels=asset_labels
    )

    db.session.commit()
    publish_entry_update(entry)

    entry_data = serialize_inventory_entry(entry)
    entry_data['new_assets'] = [
        {
            'id': asset.id,
            'asset_code': asset.asset_code,
            'label': asset.label,
            'last_printed_at': None,
        }
        for asset in new_assets
    ]

    return jsonify({
        "message": (
            "Inventory entry has been successfully added"
            if created
            else "Existing inventory entry quantity has been updated"
        ),
        "data": entry_data
    }), 201 if created else 200


@bp.route('/inventory/<int:inventory_id>/entries/validate-assets', methods=['POST'])
@api_route
def validate_inventory_entry_assets(inventory_id):
    inventory = Inventory.query.filter_by(id=inventory_id).first_or_404()
    data = get_request_json_object()

    inventory_item_id = validate_integer_id(
        data.get("inventory_item_id"),
        "inventory_item_id"
    )
    item = InventoryItem.query.filter_by(id=inventory_item_id).first_or_404()
    if not item.is_asset:
        abort(400, description="Only asset-tracked items can use asset validation")

    if data.get("asset_mode") not in (None, "existing"):
        abort(400, description="Only existing asset selection can be validated")

    attributes = helper.validate_entry_attributes(item, data.get("attributes"))
    validation = validate_existing_assets_for_entry(
        inventory,
        item,
        attributes,
        data
    )

    return jsonify({
        "data": {
            "valid": validation["valid"],
            "quantity": validation["quantity"],
            "asset_codes": validation["asset_codes"],
            "invalid_assets": validation["invalid_assets"],
            "valid_asset_codes": [
                asset.asset_code for asset in validation["assets"]
            ],
        }
    })

@bp.route('/inventory/entry/<int:entry_id>', methods=['PATCH', 'PUT'])
@api_route
def update_inventory_entry(entry_id):
    entry = InventoryItemEntry.query.filter_by(id=entry_id).first_or_404()
    require_inventory_unlocked(entry.inventory)
    data = get_request_json_object()

    inventory_id = validate_integer_id(
        data.get("inventory_id", entry.inventory_id),
        "inventory_id"
    )
    item_id = data.get("inventory_item_id", entry.inventory_item_id)
    quantity = data.get("quantity", entry.quantity)
    container_id = data.get("container_id", entry.container_id)
    previous_inventory_id = entry.inventory_id
    previous_container_id = entry.container_id
    destination_inventory = Inventory.query.filter_by(
        id=inventory_id
    ).first_or_404()
    require_inventory_unlocked(destination_inventory)

    if isinstance(quantity, bool):
        abort(400, description="Quantity must be an integer")
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        abort(400, description="Quantity must be an integer")
    if quantity < 0:
        abort(400, description="Quantity must be 0 or greater")

    item = InventoryItem.query.filter_by(id=item_id).first_or_404()

    if item.is_asset and quantity != entry.quantity:
        abort(
            400,
            description="Add asset-tracked quantity through the inventory entry form"
        )

    if container_id is not None:
        InventoryContainer.query.filter_by(id=container_id, archived=False).first_or_404()

    if "attributes" in data:
        attributes = helper.validate_entry_attributes(item, data.get("attributes"))
    else:
        attributes = entry.attributes

    duplicate = InventoryItemEntry.query.filter(
        InventoryItemEntry.id != entry.id,
        InventoryItemEntry.inventory_id == inventory_id,
        InventoryItemEntry.inventory_item_id == item_id,
        InventoryItemEntry.container_id == container_id,
        InventoryItemEntry.attributes == attributes,
        InventoryItemEntry.removed.is_(False)
    ).order_by(InventoryItemEntry.id.asc()).first()

    if duplicate:
        duplicate.quantity += quantity
        for asset in entry.assets:
            link_asset_to_entry(
                asset,
                duplicate,
                message=f"Moved to inventory entry {duplicate.id}"
            )
        entry.remove()
        db.session.commit()
        publish_inventory_update(
            inventory_ids=list({previous_inventory_id, duplicate.inventory_id}),
            container_ids=[
                value for value in {
                    previous_container_id,
                    duplicate.container_id
                } if value is not None
            ]
        )
        return jsonify(serialize_inventory_entry(duplicate))

    entry.inventory_id = inventory_id
    entry.inventory_item_id = item_id
    entry.container_id = container_id
    entry.attributes = attributes
    entry.quantity = quantity
    if quantity == 0:
        entry.remove()

    db.session.commit()
    publish_inventory_update(
        inventory_ids=list({previous_inventory_id, entry.inventory_id}),
        container_ids=[
            value for value in {previous_container_id, entry.container_id}
            if value is not None
        ]
    )

    return jsonify(serialize_inventory_entry(entry))

@bp.route('/inventory/entry/<int:entry_id>/quantity/add', methods=['PATCH'])
@api_route
def add_inventory_entry_quantity(entry_id):
    entry = InventoryItemEntry.query.filter_by(id=entry_id).first_or_404()
    require_inventory_unlocked(entry.inventory)
    data = get_request_json_object()

    if entry.inventory_item and entry.inventory_item.is_asset:
        abort(400, description="Add asset-tracked quantity through the inventory entry form")

    amount = data.get("amount")

    if amount is None:
        abort(400, description="amount is required")

    if isinstance(amount, bool):
        abort(400, description="amount must be an integer")
    try:
        amount = int(amount)
    except (TypeError, ValueError):
        abort(400, description="amount must be an integer")

    new_quantity = entry.quantity + amount

    if new_quantity < 0:
        abort(400, description="quantity cannot go below 0")

    entry.quantity = new_quantity
    if new_quantity == 0:
        entry.remove()

    db.session.commit()
    publish_entry_update(entry)

    return jsonify(entry.to_dict())

@bp.route('/inventory/entry/<int:entry_id>/quantity', methods=['PATCH'])
@api_route
def set_inventory_entry_quantity(entry_id):
    entry = InventoryItemEntry.query.filter_by(id=entry_id).first_or_404()
    require_inventory_unlocked(entry.inventory)
    data = get_request_json_object()

    if entry.inventory_item and entry.inventory_item.is_asset:
        abort(400, description="Asset-tracked quantity is managed through its assets")

    quantity = data.get("quantity")

    if quantity is None:
        abort(400, description="quantity is required")

    if isinstance(quantity, bool):
        abort(400, description="quantity must be an integer")
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        abort(400, description="quantity must be an integer")

    if quantity < 0:
        abort(400, description="quantity cannot be below 0")

    entry.quantity = quantity
    if quantity == 0:
        entry.remove()

    db.session.commit()
    publish_entry_update(entry)

    return jsonify(entry.to_dict())

@bp.route('/inventory/entry/<int:entry_id>', methods=['DELETE'])
@api_route
def delete_inventory_entry(entry_id):
    entry = InventoryItemEntry.query.filter_by(id=entry_id).first_or_404()
    require_inventory_unlocked(entry.inventory)

    asset_links = (
        InventoryAssetEntry.query
        .filter_by(inventory_item_entry_id=entry.id)
        .all()
    )
    assets = {
        link.asset.id: link.asset
        for link in asset_links
        if link.asset
    }
    entry.remove()
    for link in asset_links:
        db.session.delete(link)
    for asset in assets.values():
        add_asset_log(
            asset,
            message=f"Removed from inventory {entry.inventory.name}",
            state=asset.status
        )
        archive_asset_if_unassigned(asset, excluding_entry_id=entry.id)
    db.session.commit()
    publish_entry_update(entry)

    return jsonify({
        "message": "Inventory entry deleted",
        "id": entry_id
    })


def get_entry_assets_for_label_print(entry, data):
    asset_ids = data.get('asset_ids')
    if asset_ids is None:
        return entry.assets
    if not isinstance(asset_ids, list) or any(
        isinstance(asset_id, bool) or not isinstance(asset_id, int)
        for asset_id in asset_ids
    ):
        abort(400, description="asset_ids must be a list of integers")

    assets_by_id = {asset.id: asset for asset in entry.assets}
    unknown_ids = sorted(set(asset_ids) - set(assets_by_id))
    if unknown_ids:
        abort(
            400,
            description=(
                "Assets do not belong to this inventory entry: "
                + ", ".join(str(asset_id) for asset_id in unknown_ids)
            )
        )
    return [assets_by_id[asset_id] for asset_id in dict.fromkeys(asset_ids)]


def get_asset_print_recent_mode(data):
    recent_mode = data.get('recent_mode')
    if recent_mode is not None:
        if recent_mode not in {'reject', 'skip', 'include'}:
            abort(400, description="recent_mode must be reject, skip or include")
        return recent_mode

    force = data.get('force', False)
    if not isinstance(force, bool):
        abort(400, description="force must be true or false")
    return 'include' if force else 'reject'


@bp.route(
    '/inventory/entry/<int:entry_id>/print-labels/preview',
    methods=['POST']
)
@api_route
def preview_inventory_entry_labels(entry_id):
    entry = InventoryItemEntry.query.filter_by(id=entry_id).first_or_404()

    if not entry.inventory_item or not entry.inventory_item.is_asset:
        abort(400, description="This entry is not asset tracked")

    data = get_request_json_object()
    assets = get_entry_assets_for_label_print(entry, data)
    return jsonify({
        'data': build_asset_label_print_preview(assets, recent_hours=1)
    })


@bp.route('/inventory/entry/<int:entry_id>/print-labels', methods=['POST'])
@api_route
def print_inventory_entry_labels(entry_id):
    entry = InventoryItemEntry.query.filter_by(id=entry_id).first_or_404()
    require_inventory_unlocked(entry.inventory)

    if not entry.inventory_item or not entry.inventory_item.is_asset:
        abort(400, description="This entry is not asset tracked")

    data = get_request_json_object()
    assets = get_entry_assets_for_label_print(entry, data)
    recent_mode = get_asset_print_recent_mode(data)

    return queue_asset_labels(
        assets,
        entry,
        recent_mode=recent_mode,
        recent_hours=1
    )

#------------------------------------------ CONTAINER ------------------------------------------#

@bp.route('/inventory/containers', methods=['GET'])
@api_route
def get_inventory_containers():
    data = helper.filter_model_by_query_and_properties(InventoryContainer, request.args)
    return jsonify(data)


@bp.route('/inventory/containers/<string:field>', methods=['GET'])
@api_route
def get_inventory_containers_field(field):
    data = helper.filter_model_by_query_and_properties(InventoryContainer, request.args, field)
    return jsonify(data)


@bp.route('/inventory/containers/<int:container_id>', methods=['GET'])
@api_route
def get_inventory_container(container_id):
    container = InventoryContainer.query.filter_by(id=container_id).first_or_404()
    return jsonify(container.to_dict())


@bp.route('/inventory/containers/<int:container_id>/detail', methods=['GET'])
@api_route
def get_inventory_container_detail(container_id):
    return jsonify({"data": fetch_inventory_container_detail(container_id)})


def fetch_inventory_container_detail(container_id):
    container = InventoryContainer.query.filter_by(id=container_id).first_or_404()
    current_inventory = Inventory.current()
    entries = []
    if current_inventory:
        entries = (
            InventoryItemEntry.query
            .filter_by(
                container_id=container.id,
                inventory_id=current_inventory.id,
                removed=False
            )
            .order_by(InventoryItemEntry.id.asc())
            .all()
        )
    assets_by_id = {
        asset.id: asset
        for entry in entries
        for asset in entry.assets
        if asset.container_id == container.id
    }

    return {
        "container": container.to_dict(),
        "inventory": (
            current_inventory.to_dict()
            if current_inventory else None
        ),
        "summary": {
            "entry_count": len(entries),
            "total_count": sum(entry.quantity for entry in entries),
            "asset_count": len(assets_by_id),
        },
        "entries": [serialize_inventory_entry(entry) for entry in entries],
        "assets": [
            asset.to_dict()
            for asset in sorted(
                assets_by_id.values(),
                key=lambda asset: asset.asset_code
            )
        ],
    }


@bp.route('/inventory/containers/<int:container_id>/stream', methods=['GET'])
@api_route
def get_inventory_container_detail_sse(container_id):
    InventoryContainer.query.filter_by(id=container_id).first_or_404()
    return redis_sse_stream(
        lambda: fetch_inventory_container_detail(container_id),
        RedisChannels.INVENTORY_UPDATE,
        should_refresh=lambda payload: container_update_matches(
            payload,
            container_id
        )
    )


@bp.route('/inventory/containers/<int:container_id>/print-label', methods=['POST'])
@api_route
def print_inventory_container_label(container_id):
    detail = fetch_inventory_container_detail(container_id)
    inventory = Inventory.current()
    if not inventory:
        abort(409, description="There is no active inventory")
    if not get_config_value(ConfigType.JOLT_ENABLED):
        abort(409, description="JOLT integration is not enabled")

    contact_name, contact_email = get_inventory_label_contact(inventory)
    container = InventoryContainer.query.filter_by(id=container_id).first_or_404()
    from common.integrations import jolt
    success, message = jolt.add_container_to_print_queue(
        container=container,
        inventory=inventory,
        item_count=detail["summary"]["total_count"],
        asset_count=detail["summary"]["asset_count"],
        contact_name=contact_name,
        contact_email=contact_email
    )
    return jsonify({'message': message}), 200 if success else 400


@bp.route('/inventory/containers/<int:container_id>/<string:field>', methods=['GET'])
@api_route
def get_inventory_container_field(container_id, field):
    container = InventoryContainer.query.filter_by(id=container_id).first_or_404()
    allowed_fields = list(container.to_dict().keys())

    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    value = getattr(container, field)
    return jsonify({field: str(value)})


@bp.route('/inventory/containers', methods=['POST'])
@api_route
def create_inventory_container():
    data = get_request_json_object()

    name = data.get('name')
    if not isinstance(name, str) or not name.strip():
        abort(400, description="name is required")
    if len(name.strip()) > 255:
        abort(400, description="name must be 255 characters or fewer")

    description = validate_optional_string(
        data.get('description'),
        "description",
        MAX_CONTAINER_DESCRIPTION_LENGTH
    )
    parent_container_id = validate_container_parent(
        data.get('parent_container_id')
    )

    container = InventoryContainer(
        name=name.strip(),
        description=description,
        parent_container_id=parent_container_id
    )

    db.session.add(container)
    db.session.commit()
    publish_inventory_update(container_ids=[container.id])

    return jsonify(container.to_dict()), 201


@bp.route('/inventory/containers/<int:container_id>', methods=['PATCH', 'PUT'])
@api_route
def update_inventory_container(container_id):
    container = InventoryContainer.query.filter_by(id=container_id).first_or_404()
    data = get_request_json_object()

    if "name" in data:
        name = data["name"]
        if not isinstance(name, str) or not name.strip():
            abort(400, description="name is required")
        if len(name.strip()) > 255:
            abort(400, description="name must be 255 characters or fewer")
        container.name = name.strip()

    if "description" in data:
        container.description = validate_optional_string(
            data["description"],
            "description",
            MAX_CONTAINER_DESCRIPTION_LENGTH
        )

    if "parent_container_id" in data:
        container.parent_container_id = validate_container_parent(
            data["parent_container_id"],
            container=container
        )

    db.session.commit()
    publish_inventory_update(container_ids=[container.id])

    return jsonify(container.to_dict())


@bp.route('/inventory/containers/<int:container_id>/archive', methods=['POST'])
@api_route
def archive_inventory_container(container_id):
    container = InventoryContainer.query.filter_by(id=container_id).first_or_404()
    container.archive()
    db.session.commit()
    publish_inventory_update(container_ids=[container.id])

    return jsonify({'message': 'The container has been successfully archived'})


@bp.route('/inventory/containers/<int:container_id>/activate', methods=['POST'])
@api_route
def activate_inventory_container(container_id):
    container = InventoryContainer.query.filter_by(id=container_id).first_or_404()
    container.activate()
    db.session.commit()
    publish_inventory_update(container_ids=[container.id])

    return jsonify({'message': 'The container has been successfully activated'})

#------------------------------------------ ASSETS ------------------------------------------#
def validate_asset_inventory_entry(inventory_item_id, inventory_item_entry_id):
    if inventory_item_entry_id is None:
        return None

    inventory_item_entry_id = validate_integer_id(
        inventory_item_entry_id,
        "inventory_item_entry_id"
    )
    entry = InventoryItemEntry.query.filter_by(
        id=inventory_item_entry_id,
        removed=False
    ).first_or_404()
    if entry.inventory_item_id != inventory_item_id:
        abort(400, description="inventory_item_entry_id does not match inventory_item_id")
    return entry


@bp.route('/inventory/assets', methods=['GET'])
@api_route
def get_inventory_assets():
    data = helper.filter_model_by_query_and_properties(InventoryAsset, request.args)
    return jsonify(data)


@bp.route('/inventory/assets/<string:field>', methods=['GET'])
@api_route
def get_inventory_assets_field(field):
    data = helper.filter_model_by_query_and_properties(InventoryAsset, request.args, field)
    return jsonify(data)


@bp.route('/inventory/assets/<int:asset_id>', methods=['GET'])
@api_route
def get_inventory_asset(asset_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    return jsonify(asset.to_dict())


@bp.route('/inventory/assets/code/<string:asset_code>', methods=['GET'])
@api_route
def get_inventory_asset_by_code(asset_code):
    asset = InventoryAsset.query.filter_by(asset_code=asset_code).first_or_404()
    return jsonify(asset.to_dict())


@bp.route('/inventory/assets/<int:asset_id>/logs', methods=['GET'])
@api_route
def get_inventory_asset_logs(asset_id):
    InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    logs = (
        InventoryAssetLog.query
        .filter_by(inventory_asset_id=asset_id)
        .order_by(InventoryAssetLog.date.desc(), InventoryAssetLog.id.desc())
        .all()
    )
    return jsonify({"data": [log.to_dict() for log in logs]})


@bp.route('/inventory/assets/<int:asset_id>/print-label', methods=['POST'])
@api_route
def print_inventory_asset_label(asset_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    data = get_request_json_object()
    force = data.get("force", False)
    if not isinstance(force, bool):
        abort(400, description="force must be true or false")
    return queue_asset_labels(
        [asset],
        asset.current_inventory_item_entry,
        recent_mode='include' if force else 'reject',
        recent_hours=24
    )


@bp.route('/inventory/assets/<int:asset_id>/logs', methods=['POST'])
@api_route
def create_inventory_asset_log(asset_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    require_asset_inventory_unlocked(asset)
    data = get_request_json_object()

    message = validate_optional_string(data.get("message"), "message", 512)
    state = data.get("state")
    if state is not None:
        state = validate_asset_state(state)
    note = validate_optional_string(
        data.get("note"),
        "note",
        MAX_ASSET_NOTE_LENGTH
    )
    if not message and not state and not note:
        abort(400, description="A message, state or note is required")

    log = add_asset_log(asset, message=message, state=state, note=note)
    db.session.commit()
    publish_inventory_update(refresh_all=True)
    return jsonify(log.to_dict()), 201


@bp.route('/inventory/assets/<int:asset_id>/<string:field>', methods=['GET'])
@api_route
def get_inventory_asset_field(asset_id, field):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    allowed_fields = list(asset.to_dict().keys())

    if field not in allowed_fields:
        abort(404, description=f"Field '{field}' not found or allowed")

    value = asset.to_dict()[field]
    return jsonify({field: str(value)})


@bp.route('/inventory/assets', methods=['POST'])
@api_route
def create_inventory_asset():
    data = get_request_json_object()

    asset_code = data.get('asset_code')
    inventory_item_id = data.get('inventory_item_id')

    if not isinstance(asset_code, str) or not asset_code.strip():
        abort(400, description="asset_code is required")
    asset_code = asset_code.strip().upper()
    if len(asset_code) > 100:
        abort(400, description="asset_code must be 100 characters or fewer")

    if inventory_item_id is None:
        abort(400, description="inventory_item_id is required")

    inventory_item_id = validate_integer_id(
        inventory_item_id,
        "inventory_item_id"
    )
    item = InventoryItem.query.filter_by(id=inventory_item_id).first_or_404()

    if not item.is_asset:
        abort(400, description="Only asset-tracked inventory items can have assets")

    inventory_item_entry_id = data.get('inventory_item_entry_id')
    entry = validate_asset_inventory_entry(
        inventory_item_id,
        inventory_item_entry_id
    )

    existing_asset = InventoryAsset.query.filter_by(asset_code=asset_code).first()
    if existing_asset:
        abort(409, description="asset_code already exists")

    attributes = helper.validate_entry_attributes(item, data.get('attributes'))
    if entry and (attributes or None) != (entry.attributes or None):
        abort(400, description="Asset attributes must match the inventory entry")

    asset = InventoryAsset(
        asset_code=asset_code,
        inventory_item_id=inventory_item_id,
        label=validate_asset_label(item, data.get('label')),
        attributes=attributes,
        status=validate_asset_state(
            data.get('status', InventoryAssetState.ACTIVE.name)
        ),
        notes=validate_optional_string(
            data.get('notes'),
            "notes",
            MAX_ASSET_NOTE_LENGTH
        )
    )

    db.session.add(asset)
    db.session.flush()
    add_asset_log(asset, message="Asset created", state=asset.status)
    if entry:
        require_inventory_unlocked(entry.inventory)
        entry.quantity += 1
        link_asset_to_entry(asset, entry)
    db.session.commit()
    publish_inventory_update(refresh_all=True)

    return jsonify(asset.to_dict()), 201


@bp.route('/inventory/assets/<int:asset_id>', methods=['PATCH', 'PUT'])
@api_route
def update_inventory_asset(asset_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    require_asset_inventory_unlocked(asset)
    data = get_request_json_object()

    inventory_item_id = data.get("inventory_item_id", asset.inventory_item_id)
    inventory_item_id = validate_integer_id(
        inventory_item_id,
        "inventory_item_id"
    )
    inventory_item_entry_id = data.get("inventory_item_entry_id")
    entry = validate_asset_inventory_entry(
        inventory_item_id,
        inventory_item_entry_id
    )

    if "asset_code" in data:
        if not isinstance(data["asset_code"], str) or not data["asset_code"].strip():
            abort(400, description="asset_code is required")
        asset_code = data["asset_code"].strip().upper()
        if len(asset_code) > 100:
            abort(400, description="asset_code must be 100 characters or fewer")

        existing_asset = InventoryAsset.query.filter(
            InventoryAsset.id != asset.id,
            InventoryAsset.asset_code == asset_code
        ).first()

        if existing_asset:
            abort(409, description="asset_code already exists")

        asset.asset_code = asset_code

    if "inventory_item_id" in data:
        if asset.entry_links and data["inventory_item_id"] != asset.inventory_item_id:
            abort(409, description="Asset item cannot change after inventory history exists")
        item = InventoryItem.query.filter_by(id=data["inventory_item_id"]).first_or_404()

        if not item.is_asset:
            abort(400, description="Only asset-tracked inventory items can have assets")

        asset.inventory_item_id = data["inventory_item_id"]

    if "inventory_item_entry_id" in data:
        if entry is None:
            abort(400, description="inventory_item_entry_id cannot be null")
        if asset.current_inventory_item_entry_id != entry.id:
            move_asset_to_entry(asset, entry)

    if "attributes" in data:
        item = InventoryItem.query.filter_by(id=inventory_item_id).first_or_404()
        asset.attributes = helper.validate_entry_attributes(item, data["attributes"])

    if "label" in data:
        item = InventoryItem.query.filter_by(id=inventory_item_id).first_or_404()
        asset.label = validate_asset_label(item, data["label"])

    if "status" in data:
        status = validate_asset_state(data["status"])
        if status != asset.status:
            set_asset_state(asset, status, note=data.get("notes"))

    if "notes" in data:
        asset.notes = validate_optional_string(
            data["notes"],
            "notes",
            MAX_ASSET_NOTE_LENGTH
        )

    db.session.commit()
    publish_inventory_update(refresh_all=True)

    return jsonify(asset.to_dict())


@bp.route('/inventory/assets/<int:asset_id>/state', methods=['PATCH'])
@api_route
def update_inventory_asset_state(asset_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    require_asset_inventory_unlocked(asset)
    data = get_request_json_object()

    if "state" not in data:
        abort(400, description="state is required")

    set_asset_state(asset, data["state"], note=data.get("note"))
    db.session.commit()
    publish_inventory_update(refresh_all=True)
    return jsonify({
        "message": "Asset state updated",
        "data": asset.to_dict()
    })


@bp.route('/inventory/assets/<int:asset_id>/move', methods=['POST'])
@api_route
def move_inventory_asset(asset_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    data = get_request_json_object()

    if "inventory_item_entry_id" not in data:
        abort(400, description="inventory_item_entry_id is required")

    entry = validate_asset_inventory_entry(
        asset.inventory_item_id,
        data["inventory_item_entry_id"]
    )
    move_asset_to_entry(asset, entry)
    db.session.commit()
    publish_inventory_update(refresh_all=True)

    return jsonify(asset.to_dict())


@bp.route(
    '/inventory/assets/<int:asset_id>/entries/<int:entry_id>',
    methods=['DELETE']
)
@api_route
def remove_inventory_asset_from_entry(asset_id, entry_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    entry = InventoryItemEntry.query.filter_by(
        id=entry_id,
        removed=False
    ).first_or_404()

    if entry.inventory_item_id != asset.inventory_item_id:
        abort(400, description="Asset and inventory entry items do not match")

    data = get_request_json_object()
    note = validate_optional_string(
        data.get("note"),
        "note",
        MAX_ASSET_NOTE_LENGTH
    )
    remove_asset_from_entry(
        asset,
        entry,
        message=f"Removed from inventory {entry.inventory.name}",
        note=note
    )
    db.session.commit()
    publish_inventory_update(refresh_all=True)

    return jsonify({
        "message": "Asset removed from inventory",
        "data": asset.to_dict()
    })


@bp.route('/inventory/assets/<int:asset_id>/archive', methods=['POST'])
@api_route
def archive_inventory_asset(asset_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    require_asset_inventory_unlocked(asset)
    data = get_request_json_object()
    set_asset_state(
        asset,
        InventoryAssetState.ARCHIVED.name,
        note=data.get("reason")
    )
    db.session.commit()
    publish_inventory_update(refresh_all=True)

    return jsonify({'message': 'The asset has been successfully archived'})


@bp.route('/inventory/assets/<int:asset_id>/activate', methods=['POST'])
@api_route
def activate_inventory_asset(asset_id):
    asset = InventoryAsset.query.filter_by(id=asset_id).first_or_404()
    require_asset_inventory_unlocked(asset)
    set_asset_state(asset, InventoryAssetState.ACTIVE.name)
    db.session.commit()
    publish_inventory_update(refresh_all=True)

    return jsonify({'message': 'The asset has been successfully activated'})
