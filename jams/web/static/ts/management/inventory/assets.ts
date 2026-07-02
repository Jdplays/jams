import { createGrid, GridApi, GridOptions } from "ag-grid-community"

import {
    getAllInventory,
    getInventoryAssets,
    getInventoryContainers,
    getInventoryItems,
} from "@global/endpoints"
import {
    Inventory,
    InventoryAsset,
    InventoryContainer,
    InventoryItem,
} from "@global/endpoints_interfaces"
import { buildAttributeBadges, errorToast } from "@global/helper"

interface AssetGridRow {
    id:string
    kind:"group"|"asset"
    item?:InventoryItem
    asset?:InventoryAsset
    count?:number
}

let gridApi:GridApi<AssetGridRow>
let items = new Map<number, InventoryItem>()
let containers = new Map<number, InventoryContainer>()
let inventories = new Map<number, Inventory>()

function errorMessage(error:any):string {
    return error.responseJSON?.description
        ?? error.responseJSON?.message
        ?? "An unknown error occurred"
}

function groupRenderer(params:any):HTMLElement {
    const wrapper = document.createElement("div")
    wrapper.classList.add("d-flex", "align-items-center", "h-100", "px-3", "bg-secondary-lt")

    const icon = document.createElement("i")
    icon.classList.add("ti", "ti-package", "me-2")
    const name = document.createElement("strong")
    name.textContent = params.data.item?.name ?? "Unknown item"
    const count = document.createElement("span")
    count.classList.add("badge", "bg-blue-lt", "ms-2")
    count.textContent = `${params.data.count ?? 0} assets`

    wrapper.append(icon, name, count)
    return wrapper
}

function viewButton(asset:InventoryAsset):HTMLAnchorElement {
    const button = document.createElement("a")
    button.classList.add("btn", "btn-sm", "btn-outline-primary")
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
    button.href = `/private/management/inventory/assets/${asset.id}?return_to=${returnTo}`
    button.innerHTML = '<i class="ti ti-eye me-1"></i>View'
    return button
}

function latestInventoryHistory(asset:InventoryAsset) {
    return [...(asset.inventory_entry_history ?? [])].sort((left, right) => {
        const leftDate = left.inventory_date ?? ""
        const rightDate = right.inventory_date ?? ""
        if (leftDate !== rightDate) {
            return rightDate.localeCompare(leftDate)
        }
        return (right.linked_at ?? "").localeCompare(left.linked_at ?? "")
    })[0]
}

function buildRows(assets:InventoryAsset[]):AssetGridRow[] {
    const grouped = new Map<number, InventoryAsset[]>()
    for (const asset of assets) {
        const group = grouped.get(asset.inventory_item_id) ?? []
        group.push(asset)
        grouped.set(asset.inventory_item_id, group)
    }

    return Array.from(grouped.entries())
        .sort((left, right) => {
            const leftName = items.get(left[0])?.name ?? ""
            const rightName = items.get(right[0])?.name ?? ""
            return leftName.localeCompare(rightName)
        })
        .flatMap(([itemId, groupAssets]) => [
            {
                id: `group-${itemId}`,
                kind: "group" as const,
                item: items.get(itemId),
                count: groupAssets.length,
            },
            ...groupAssets.map(asset => ({
                id: `asset-${asset.id}`,
                kind: "asset" as const,
                asset,
            })),
        ])
}

function initialiseGrid() {
    const element = document.getElementById("inventory-assets-grid")
    if (!element) {
        throw new Error("Inventory assets grid was not found")
    }

    const isMobile = window.matchMedia("(max-width: 767.98px)").matches
    const options:GridOptions<AssetGridRow> = {
        animateRows: true,
        enableCellTextSelection: true,
        getRowId: params => params.data.id,
        isFullWidthRow: params => params.rowNode.data?.kind === "group",
        fullWidthCellRenderer: groupRenderer,
        getRowHeight: params => params.data?.kind === "group" ? 42 : 48,
        defaultColDef: { sortable: true, filter: true, resizable: true },
        columnDefs: [
            {
                headerName: "Asset code",
                valueGetter: params => params.data?.asset?.asset_code ?? "",
                minWidth: 170,
                flex: 2,
            },
            {
                headerName: "Label",
                valueGetter: params => params.data?.asset?.label ?? "",
                minWidth: 150,
                flex: 1,
            },
            {
                headerName: "Status",
                valueGetter: params => params.data?.asset?.status ?? "",
                minWidth: 120,
                flex: 1,
            },
            {
                headerName: "Inventory",
                valueGetter: params => {
                    const asset = params.data?.asset
                    if (!asset) {
                        return ""
                    }
                    const history = latestInventoryHistory(asset)
                    if (history) {
                        return history.inventory_date
                            ? `${history.inventory_name} (${history.inventory_date})`
                            : history.inventory_name
                    }
                    const id = asset.inventory_id
                    return id ? inventories.get(id)?.name ?? `#${id}` : "Not assigned"
                },
                minWidth: 180,
                flex: 2,
                hide: isMobile,
            },
            {
                headerName: "Container",
                valueGetter: params => {
                    const id = params.data?.asset?.container_id
                    return id ? containers.get(id)?.name ?? `#${id}` : "No container"
                },
                minWidth: 180,
                flex: 2,
                hide: isMobile,
            },
            {
                headerName: "Attributes",
                cellRenderer: (params:any) => {
                    const asset = params.data?.asset as InventoryAsset|undefined
                    return buildAttributeBadges(
                        asset?.attributes,
                        asset ? items.get(asset.inventory_item_id)?.attribute_schema : null
                    )
                },
                minWidth: 220,
                flex: 2,
                hide: isMobile,
            },
            {
                headerName: "Actions",
                sortable: false,
                filter: false,
                cellRenderer: (params:any) => params.data?.asset
                    ? viewButton(params.data.asset)
                    : "",
                width: 110,
            },
        ],
    }

    gridApi = createGrid(element, options)
    const filter = document.getElementById("inventory-assets-filter") as HTMLInputElement|null
    filter?.addEventListener("input", () => {
        gridApi.setGridOption("quickFilterText", filter.value)
    })
}

async function loadAssets() {
    const [assetResponse, itemResponse, containerResponse, inventoryResponse] = await Promise.all([
        getInventoryAssets(),
        getInventoryItems(),
        getInventoryContainers(),
        getAllInventory(),
    ])

    items = new Map(itemResponse.data.map(item => [item.id, item]))
    containers = new Map(containerResponse.data.map(container => [container.id, container]))
    inventories = new Map(inventoryResponse.data.map(inventory => [inventory.id, inventory]))

    const entryIdText = new URLSearchParams(window.location.search).get("entry_id")
    const entryId = entryIdText ? Number(entryIdText) : null
    const assets = entryId
        ? assetResponse.data.filter(asset => (
            asset.inventory_item_entry_ids.includes(entryId)
            || (asset.inventory_entry_history ?? []).some(
                history => history.inventory_item_entry_id === entryId
            )
        ))
        : assetResponse.data

    if (entryId) {
        document.getElementById("inventory-assets-entry-filter")?.classList.remove("d-none")
        const filterText = document.getElementById("inventory-assets-entry-filter-text")
        if (filterText) {
            filterText.textContent = `Showing assets linked to inventory entry #${entryId}`
        }
    }

    gridApi.setGridOption("rowData", buildRows(assets))
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        initialiseGrid()
        await loadAssets()
    } catch (error) {
        console.error(error)
        errorToast(errorMessage(error))
    }
})
