import { createGrid, GridApi, GridOptions } from "ag-grid-community"

import {
    getInventoryContainerDetail,
    printInventoryContainerLabel,
    removeInventoryAssetFromEntry,
    updateInventoryEntry,
} from "@global/endpoints"
import {
    InventoryAsset,
    InventoryContainerDetail,
    InventoryItemEntry,
} from "@global/endpoints_interfaces"
import { getLiveInventoryContainerDetail } from "@global/sse_endpoints"
import { SSEManager } from "@global/sse_manager"
import { buildAttributeBadges, errorToast, successToast } from "@global/helper"

let containerId:number
let canManageInventories = false
let currentDetail:InventoryContainerDetail
let entriesGrid:GridApi<InventoryItemEntry>
let assetsGrid:GridApi<InventoryAsset>
let containerSSE:SSEManager<InventoryContainerDetail>

function canEditCurrentInventory():boolean {
    return canManageInventories && !currentDetail?.inventory?.locked
}

function errorMessage(error:any):string {
    return error.responseJSON?.description
        ?? error.responseJSON?.message
        ?? "An unknown error occurred"
}

function setText(id:string, value:string|number) {
    const element = document.getElementById(id)
    if (element) {
        element.textContent = String(value)
    }
}

function buildQuantityEditor(entry:InventoryItemEntry):HTMLElement {
    if (!canEditCurrentInventory() || entry.item?.is_asset) {
        const value = document.createElement("span")
        value.textContent = String(entry.quantity)
        if (entry.item?.is_asset) {
            value.title = "Asset quantity is managed by the individual assets below"
        }
        return value
    }

    const editor = document.createElement("div")
    editor.classList.add("inventory-entry-quantity-editor")
    const decrement = document.createElement("button")
    decrement.type = "button"
    decrement.classList.add("btn", "btn-sm", "btn-outline-secondary")
    decrement.innerHTML = '<i class="ti ti-minus"></i>'
    const input = document.createElement("input")
    input.classList.add("form-control", "form-control-sm")
    input.type = "number"
    input.min = "0"
    input.value = String(entry.quantity)
    const increment = document.createElement("button")
    increment.type = "button"
    increment.classList.add("btn", "btn-sm", "btn-outline-secondary")
    increment.innerHTML = '<i class="ti ti-plus"></i>'

    const save = async (quantity:number) => {
        editor.querySelectorAll<HTMLInputElement|HTMLButtonElement>("input, button")
            .forEach(control => control.disabled = true)
        try {
            await updateInventoryEntry(entry.id, { quantity: Math.max(0, quantity) })
            successToast("Entry quantity updated")
            await loadDetail()
        } catch (error) {
            editor.querySelectorAll<HTMLInputElement|HTMLButtonElement>("input, button")
                .forEach(control => control.disabled = false)
            errorToast(errorMessage(error))
        }
    }
    decrement.onclick = () => save(entry.quantity - 1)
    increment.onclick = () => save(entry.quantity + 1)
    input.onchange = () => save(Number(input.value))
    editor.append(decrement, input, increment)
    return editor
}

function buildAssetActions(asset:InventoryAsset):HTMLElement {
    const actions = document.createElement("div")
    actions.classList.add("btn-list", "flex-nowrap")
    const view = document.createElement("a")
    view.classList.add("btn", "btn-sm", "btn-outline-primary")
    const returnTo = encodeURIComponent(window.location.pathname)
    view.href = `/private/management/inventory/assets/${asset.id}?return_to=${returnTo}`
    view.innerHTML = '<i class="ti ti-eye me-1"></i>View'
    actions.appendChild(view)

    const entry = currentDetail.entries.find(candidate => candidate.asset_ids.includes(asset.id))
    if (canEditCurrentInventory() && entry) {
        const remove = document.createElement("button")
        remove.type = "button"
        remove.classList.add("btn", "btn-sm", "btn-outline-danger")
        remove.innerHTML = '<i class="ti ti-minus me-1"></i>Remove'
        remove.onclick = async () => {
            if (!window.confirm(`Remove ${asset.asset_code} from this inventory?`)) {
                return
            }
            remove.disabled = true
            try {
                const response = await removeInventoryAssetFromEntry(asset.id, entry.id)
                successToast(response.message)
                await loadDetail()
            } catch (error) {
                remove.disabled = false
                errorToast(errorMessage(error))
            }
        }
        actions.appendChild(remove)
    }
    return actions
}

function initialiseGrids() {
    const entriesElement = document.getElementById("container-entries-grid")
    const assetsElement = document.getElementById("container-assets-grid")
    if (!entriesElement || !assetsElement) {
        throw new Error("Container grids were not found")
    }

    const isMobile = window.matchMedia("(max-width: 767.98px)").matches
    const entriesOptions:GridOptions<InventoryItemEntry> = {
        domLayout: "autoHeight",
        animateRows: true,
        getRowId: params => String(params.data.id),
        overlayNoRowsTemplate: "No entries in the current inventory use this container.",
        defaultColDef: { sortable: true, filter: true, resizable: true },
        columnDefs: [
            {
                headerName: "Item",
                valueGetter: params => params.data?.item?.name ?? "Unknown item",
                minWidth: 180,
                flex: 2,
            },
            {
                headerName: "Inventory",
                valueGetter: params => params.data?.inventory?.name ?? "",
                minWidth: 170,
                flex: 1,
                hide: isMobile,
            },
            {
                field: "attributes",
                headerName: "Attributes",
                cellRenderer: (params:any) => buildAttributeBadges(
                    params.value,
                    params.data?.item?.attribute_schema
                ),
                minWidth: 220,
                flex: 2,
                hide: isMobile,
            },
            {
                field: "quantity",
                headerName: "Quantity",
                cellRenderer: (params:any) => params.data
                    ? buildQuantityEditor(params.data)
                    : "",
                minWidth: 170,
                width: 170,
            },
        ],
    }
    entriesGrid = createGrid(entriesElement, entriesOptions)

    const assetsOptions:GridOptions<InventoryAsset> = {
        domLayout: "autoHeight",
        animateRows: true,
        getRowId: params => String(params.data.id),
        overlayNoRowsTemplate: "No assets in the current inventory use this container.",
        defaultColDef: { sortable: true, filter: true, resizable: true },
        columnDefs: [
            { field: "asset_code", headerName: "Asset ID", minWidth: 150, flex: 1 },
            { field: "label", headerName: "Label", minWidth: 150, flex: 1 },
            {
                headerName: "Item",
                valueGetter: params => currentDetail?.entries.find(
                    entry => entry.asset_ids.includes(params.data?.id ?? -1)
                )?.item?.name ?? "Unknown item",
                minWidth: 180,
                flex: 2,
            },
            { field: "status", headerName: "Status", minWidth: 120, hide: isMobile },
            {
                headerName: "Actions",
                sortable: false,
                filter: false,
                cellRenderer: (params:any) => params.data
                    ? buildAssetActions(params.data)
                    : "",
                minWidth: canManageInventories ? 210 : 110,
                width: canManageInventories ? 210 : 110,
            },
        ],
    }
    assetsGrid = createGrid(assetsElement, assetsOptions)
}

function render(detail:InventoryContainerDetail) {
    currentDetail = detail
    setText("container-name", detail.container.name)
    setText("container-description", detail.container.description || "No description")
    setText("container-inventory-name", detail.inventory?.name ?? "No active inventory")
    setText("container-entry-count", detail.summary.entry_count)
    setText("container-total-count", detail.summary.total_count)
    setText("container-asset-count", detail.summary.asset_count)
    document.getElementById("container-edit-link")
        ?.classList.toggle("d-none", Boolean(detail.inventory?.locked))
    entriesGrid.setGridOption("rowData", detail.entries)
    assetsGrid.setGridOption("rowData", detail.assets)
}

async function loadDetail() {
    const response = await getInventoryContainerDetail(containerId)
    render(response.data)
}

async function printContainerLabel() {
    const button = document.getElementById("print-container-label") as HTMLButtonElement
    button.disabled = true
    try {
        const response = await printInventoryContainerLabel(containerId)
        successToast(response.message)
    } catch (error) {
        errorToast(errorMessage(error))
    } finally {
        button.disabled = false
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.getElementById("inventory-container-detail-page")
    containerId = Number(page?.dataset.containerId)
    canManageInventories = page?.dataset.canManageInventories === "true"
    if (!containerId) {
        return
    }

    try {
        initialiseGrids()
        await loadDetail()
        document.getElementById("print-container-label")
            ?.addEventListener("click", printContainerLabel)
        containerSSE = getLiveInventoryContainerDetail(containerId)
        containerSSE.onUpdate(render)
    } catch (error) {
        console.error(error)
        errorToast(errorMessage(error))
    }
})

window.addEventListener("beforeunload", () => containerSSE?.stop())
