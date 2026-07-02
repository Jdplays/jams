from datetime import UTC, datetime
from sqlalchemy  import Boolean, Column, DateTime, ForeignKey, String, Integer, Date, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import db
from common.util.enums import InventoryAssetState, InventoryItemType

class Inventory(db.Model):
    __tablename__ = "inventory"

    id = Column(Integer(), primary_key=True)
    name = Column(String(128), nullable=False, unique=False)
    date = Column(Date, nullable=False, default=lambda: datetime.now(UTC).date())
    coordinator_id = Column(Integer, ForeignKey('user.id'), nullable=True)
    active = Column(Boolean(), nullable=False, default=True)

    user = relationship('User')

    def __init__(self, name, date=None, coordinator_id=None):
        self.name = name
        self.date = date or datetime.now(UTC).date()
        self.coordinator_id = coordinator_id
        self.active = True

    def activate(self):
        self.active = True

    def archive(self):
        self.active = False

    @classmethod
    def current(cls):
        return (
            cls.query
            .filter_by(active=True)
            .order_by(cls.date.desc(), cls.id.desc())
            .first()
        )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date.isoformat(),
            'coordinator_id': self.coordinator_id,
            'active': self.active
        }

class InventoryItem(db.Model):
    __tablename__ = "inventory_item"

    id = Column(Integer(), primary_key=True)
    name = Column(String(128), nullable=False, unique=False)
    description = Column(String(512), nullable=True)
    type = Column(String(100), nullable=False, default=InventoryItemType.PHYSICAL.name, server_default=InventoryItemType.PHYSICAL.name)
    is_asset = Column(Boolean(), nullable=False, default=False, server_default='false')
    asset_code_prefix = Column(String(20), nullable=True, unique=True)
    needs_label = Column(Boolean(), nullable=False, default=False, server_default='false')
    archived = Column(Boolean(), nullable=False, default=False, server_default='false')
    attribute_schema: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)
    # TODO: Maybe do group later?

    def __init__(
        self,
        name,
        description=None,
        type=InventoryItemType.PHYSICAL.name,
        is_asset=False,
        asset_code_prefix=None,
        needs_label=False,
        attribute_schema=None
    ):
        self.name = name
        self.description = description
        self.type = type
        self.is_asset = is_asset
        self.asset_code_prefix = asset_code_prefix
        self.needs_label = needs_label
        self.attribute_schema = attribute_schema

    def archive(self):
        self.archived = True

    def activate(self):
        self.archived = False

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'type': self.type,
            'is_asset': self.is_asset,
            'asset_code_prefix': self.asset_code_prefix,
            'needs_label': self.needs_label,
            'asset_count': len(getattr(self, 'assets', [])),
            'archived': self.archived,
            'attribute_schema': self.attribute_schema
        }

class InventoryItemEntry(db.Model):
    __tablename__ = "inventory_item_entry"

    id = Column(Integer(), primary_key=True)
    inventory_id = Column(Integer, ForeignKey('inventory.id'), nullable=True)
    inventory_item_id = Column(Integer, ForeignKey('inventory_item.id'), nullable=True)
    attributes: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)
    quantity = Column(Integer, nullable=False, default=0)
    container_id = Column(Integer, ForeignKey('inventory_container.id'), nullable=True)
    removed = Column(Boolean, nullable=False, default=False, server_default='false')
    removed_at = Column(DateTime, nullable=True)

    container = relationship('InventoryContainer', backref='entries')
    inventory_item = relationship('InventoryItem', backref='entries')
    inventory = relationship('Inventory', backref='entries')

    def __init__(self, inventory_id, inventory_item_id, container_id=None, attributes=None, quantity=0):
        self.inventory_id = inventory_id
        self.inventory_item_id = inventory_item_id
        self.container_id = container_id
        self.attributes = attributes
        self.quantity = quantity

    @property
    def assets(self):
        assets_by_id = {}
        for link in getattr(self, 'asset_links', []):
            if link.asset:
                assets_by_id[link.asset.id] = link.asset
        return list(assets_by_id.values())

    def remove(self):
        self.removed = True
        self.removed_at = datetime.now(UTC)

    def to_dict(self):
        assets = getattr(self, "assets", [])
        return {
            'id': self.id,
            'inventory_id': self.inventory_id,
            'inventory_item_id': self.inventory_item_id,
            'container_id': self.container_id,
            'attributes': self.attributes,
            'quantity': self.quantity,
            'removed': self.removed,
            'removed_at': self.removed_at.isoformat() if self.removed_at else None,

            'asset_count': len(assets),
            'asset_ids': [asset.id for asset in assets],
            'asset_codes': [asset.asset_code for asset in assets],
            'assets': [
                {
                    'id': asset.id,
                    'asset_code': asset.asset_code,
                    'label': asset.label,
                    'last_printed_at': (
                        asset.last_printed_at.isoformat()
                        if asset.last_printed_at else None
                    ),
                }
                for asset in assets
            ],
        }

class InventoryContainer(db.Model):
    __tablename__ = "inventory_container"

    id = Column(Integer(), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_container_id = Column(Integer, ForeignKey('inventory_container.id'), nullable=True)
    archived = Column(Boolean, nullable=False, default=False)


    parent_container = relationship(
        'InventoryContainer',
        remote_side=[id],
        backref='child_containers'
    )

    def __init__(self, name, description=None, parent_container_id=None):
        self.name = name
        self.description = description
        self.parent_container_id = parent_container_id

    def archive(self):
        self.archived = True

    def activate(self):
        self.archived = False

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'parent_container_id': self.parent_container_id,
            'archived': self.archived,
        }

class InventoryAsset(db.Model):
    __tablename__ = "inventory_asset"

    id = Column(Integer(), primary_key=True)
    asset_code = Column(String(100), nullable=False, unique=True)
    label = Column(String(255), nullable=True)

    inventory_item_id = Column(Integer, ForeignKey('inventory_item.id'), nullable=False)

    attributes: Mapped[dict] = mapped_column(JSONB, nullable=True, default=dict)

    status = Column(
        String(50),
        nullable=False,
        default=InventoryAssetState.ACTIVE.name,
        server_default=InventoryAssetState.ACTIVE.name
    )
    notes = Column(Text, nullable=True)
    last_printed_at = Column(DateTime, nullable=True)

    archived = Column(Boolean, nullable=False, default=False)
    archived_at = Column(DateTime, nullable=True)
    archive_reason = Column(Text, nullable=True)

    inventory_item = relationship('InventoryItem', backref='assets')

    def __init__(
        self,
        asset_code,
        inventory_item_id,
        label=None,
        attributes=None,
        status=InventoryAssetState.ACTIVE.name,
        notes=None
    ):
        self.asset_code = asset_code
        self.label = label
        self.inventory_item_id = inventory_item_id
        self.attributes = attributes
        self.status = status
        self.notes = notes
        self.archived = status == InventoryAssetState.ARCHIVED.name
        self.archived_at = datetime.now(UTC) if self.archived else None

    @property
    def current_entry_link(self):
        links = getattr(self, 'entry_links', [])
        return max(links, key=lambda link: link.id or 0) if links else None

    @property
    def current_inventory_item_entry(self):
        link = self.current_entry_link
        if not link or link.inventory_item_entry.removed:
            return None
        return link.inventory_item_entry

    @property
    def current_inventory_item_entry_id(self):
        entry = self.current_inventory_item_entry
        return entry.id if entry else None

    @property
    def inventory_item_entry_id(self):
        return self.current_inventory_item_entry_id

    @property
    def inventory_item_entry_ids(self):
        return [
            link.inventory_item_entry_id
            for link in getattr(self, 'entry_links', [])
        ]

    @property
    def current_container(self):
        entry = self.current_inventory_item_entry
        return entry.container if entry else None

    @property
    def container_id(self):
        return self.current_container.id if self.current_container else None

    @property
    def inventory_id(self):
        entry = self.current_inventory_item_entry
        return entry.inventory_id if entry else None

    @property
    def inventory_entry_history(self):
        rows = []
        for link in getattr(self, 'entry_links', []):
            entry = link.inventory_item_entry
            if not entry or not entry.inventory:
                continue
            rows.append({
                'inventory_asset_entry_id': link.id,
                'inventory_item_entry_id': entry.id,
                'inventory_id': entry.inventory_id,
                'inventory_name': entry.inventory.name,
                'inventory_date': entry.inventory.date.isoformat() if entry.inventory.date else None,
                'container_id': entry.container_id,
                'container_name': entry.container.name if entry.container else None,
                'linked_at': link.created_at.isoformat() if link.created_at else None,
            })

        return sorted(
            rows,
            key=lambda row: (
                row['inventory_date'] or '',
                row['linked_at'] or '',
                row['inventory_asset_entry_id'] or 0
            ),
            reverse=True
        )

    def archive(self, reason=None):
        self.archived = True
        self.archived_at = datetime.now(UTC)
        self.archive_reason = reason
        self.status = InventoryAssetState.ARCHIVED.name

    def activate(self):
        self.archived = False
        self.archived_at = None
        self.archive_reason = None
        self.status = InventoryAssetState.ACTIVE.name

    def mark_broken(self):
        self.archived = False
        self.archived_at = None
        self.archive_reason = None
        self.status = InventoryAssetState.BROKEN.name

    def to_dict(self):
        return {
            'id': self.id,
            'asset_code': self.asset_code,
            'label': self.label,
            'inventory_item_id': self.inventory_item_id,
            'inventory_item_entry_id': self.inventory_item_entry_id,
            'inventory_item_entry_ids': self.inventory_item_entry_ids,
            'inventory_id': self.inventory_id,
            'container_id': self.container_id,
            'inventory_entry_history': self.inventory_entry_history,
            'attributes': self.attributes,
            'status': self.status,
            'notes': self.notes,
            'last_printed_at': (
                self.last_printed_at.isoformat()
                if self.last_printed_at else None
            ),
            'archived': self.archived,
            'archived_at': self.archived_at.isoformat() if self.archived_at else None,
            'archive_reason': self.archive_reason
        }


class InventoryAssetEntry(db.Model):
    __tablename__ = "inventory_asset_entry"

    id = Column(Integer(), primary_key=True)
    inventory_asset_id = Column(
        Integer,
        ForeignKey('inventory_asset.id'),
        nullable=False
    )
    inventory_item_entry_id = Column(
        Integer,
        ForeignKey('inventory_item_entry.id'),
        nullable=False
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC)
    )

    asset = relationship('InventoryAsset', backref='entry_links')
    inventory_item_entry = relationship('InventoryItemEntry', backref='asset_links')

    def __init__(self, inventory_asset_id, inventory_item_entry_id):
        self.inventory_asset_id = inventory_asset_id
        self.inventory_item_entry_id = inventory_item_entry_id

    def to_dict(self):
        return {
            'id': self.id,
            'inventory_asset_id': self.inventory_asset_id,
            'inventory_item_entry_id': self.inventory_item_entry_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class InventoryAssetLog(db.Model):
    __tablename__ = "inventory_asset_log"

    id = Column(Integer(), primary_key=True)
    inventory_asset_id = Column(
        Integer,
        ForeignKey('inventory_asset.id'),
        nullable=False
    )
    message = Column(String(512), nullable=True)
    state = Column(String(50), nullable=True)
    note = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey('user.id'), nullable=True)
    date = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC)
    )

    asset = relationship('InventoryAsset', backref='logs')
    user = relationship('User')

    def __init__(
        self,
        inventory_asset_id,
        message=None,
        state=None,
        note=None,
        user_id=None
    ):
        self.inventory_asset_id = inventory_asset_id
        self.message = message
        self.state = state
        self.note = note
        self.user_id = user_id

    def to_dict(self):
        user = self.user.public_info() if self.user else None
        return {
            'id': self.id,
            'inventory_asset_id': self.inventory_asset_id,
            'message': self.message,
            'state': self.state,
            'note': self.note,
            'user_id': self.user_id,
            'user': user,
            'date': self.date.isoformat() if self.date else None,
        }
