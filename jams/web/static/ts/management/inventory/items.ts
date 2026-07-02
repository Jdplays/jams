import { createGrid, GridApi, GridOptions } from "ag-grid-community"

import {
    activateInventoryItem,
    archiveInventoryItem,
    getInventoryItems,
} from "@global/endpoints"
import { InventoryItem } from "@global/endpoints_interfaces"
import {
    buildAttributeSchemaBadges,
    errorToast,
    successToast,
} from "@global/helper"

let gridApi:GridApi<InventoryItem>
let canManageInventories = false

function errorMessage(error:any):string {
    return error.responseJSON?.description
        ?? error.responseJSON?.message
        ?? "An unknown error occurred"
}

function actionButtons(item:InventoryItem):HTMLElement {
    const wrapper = document.createElement("div")
    wrapper.classList.add("btn-list", "flex-nowrap")

    const edit = document.createElement("a")
    edit.classList.add("btn", "btn-sm", "btn-outline-primary")
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
    edit.href = `/private/management/inventory/items/${item.id}/edit?return_to=${returnTo}`
    edit.innerHTML = '<i class="ti ti-pencil me-1"></i>Edit'
    wrapper.appendChild(edit)

    const archive = document.createElement("button")
    archive.type = "button"
    archive.classList.add(
        "btn",
        "btn-sm",
        item.archived ? "btn-outline-success" : "btn-outline-danger"
    )
    archive.innerHTML = item.archived
        ? '<i class="ti ti-archive-off me-1"></i>Activate'
        : '<i class="ti ti-archive me-1"></i>Archive'
    archive.onclick = async () => {
        archive.disabled = true
        try {
            const response = item.archived
                ? await activateInventoryItem(item.id)
                : await archiveInventoryItem(item.id)
            successToast(response.message)
            await loadItems()
        } catch (error) {
            archive.disabled = false
            errorToast(errorMessage(error))
        }
    }
    wrapper.appendChild(archive)

    return wrapper
}

async function loadItems() {
    const response = await getInventoryItems()
    gridApi.setGridOption("rowData", response.data)
}

function initialiseGrid() {
    const element = document.getElementById("inventory-items-grid")
    if (!element) {
        throw new Error("Inventory items grid was not found")
    }

    const isMobile = window.matchMedia("(max-width: 767.98px)").matches
    const options:GridOptions<InventoryItem> = {
        animateRows: true,
        enableCellTextSelection: true,
        getRowId: params => String(params.data.id),
        defaultColDef: { sortable: true, filter: true, resizable: true },
        columnDefs: [
            { field: "name", headerName: "Name", minWidth: 220, flex: 2 },
            { field: "description", headerName: "Description", minWidth: 260, flex: 3, hide: isMobile },
            { field: "type", headerName: "Type", minWidth: 120, flex: 1, hide: isMobile },
            {
                headerName: "Asset tracking",
                valueGetter: params => params.data?.is_asset
                    ? `Yes (${params.data.asset_code_prefix})${params.data.needs_label ? ", individual labels" : ""}`
                    : "No",
                minWidth: 150,
                flex: 1,
            },
            {
                headerName: "Attributes",
                cellRenderer: (params:any) => buildAttributeSchemaBadges(
                    params.data?.attribute_schema
                ),
                minWidth: 300,
                flex: 3,
                hide: isMobile,
            },
            ...(canManageInventories ? [{
                headerName: "Actions",
                sortable: false,
                filter: false,
                cellRenderer: (params:any) => actionButtons(params.data),
                minWidth: 210,
                width: 210,
            }] : []),
        ],
    }

    gridApi = createGrid(element, options)
    const filter = document.getElementById("inventory-items-filter") as HTMLInputElement|null
    filter?.addEventListener("input", () => {
        gridApi.setGridOption("quickFilterText", filter.value)
    })
}

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.getElementById("inventory-items-page")
    canManageInventories = page?.dataset.canManageInventories === "true"

    try {
        initialiseGrid()
        await loadItems()
    } catch (error) {
        console.error(error)
        errorToast(errorMessage(error))
    }
})
