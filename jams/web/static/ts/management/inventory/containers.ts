import { createGrid, GridApi, GridOptions } from "ag-grid-community"

import {
    activateInventoryContainer,
    archiveInventoryContainer,
    getInventoryContainers,
} from "@global/endpoints"
import { InventoryContainer } from "@global/endpoints_interfaces"
import { errorToast, successToast } from "@global/helper"

let gridApi:GridApi<InventoryContainer>
let canManageInventories = false
let containers:InventoryContainer[] = []

function errorMessage(error:any):string {
    return error.responseJSON?.description
        ?? error.responseJSON?.message
        ?? "An unknown error occurred"
}

function actionButtons(container:InventoryContainer):HTMLElement {
    const wrapper = document.createElement("div")
    wrapper.classList.add("btn-list", "flex-nowrap")

    const edit = document.createElement("a")
    edit.classList.add("btn", "btn-sm", "btn-outline-primary")
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
    edit.href = `/private/management/inventory/containers/${container.id}/edit?return_to=${returnTo}`
    edit.innerHTML = '<i class="ti ti-pencil me-1"></i>Edit'
    wrapper.appendChild(edit)

    const archive = document.createElement("button")
    archive.type = "button"
    archive.classList.add(
        "btn",
        "btn-sm",
        container.archived ? "btn-outline-success" : "btn-outline-danger"
    )
    archive.innerHTML = container.archived
        ? '<i class="ti ti-archive-off me-1"></i>Activate'
        : '<i class="ti ti-archive me-1"></i>Archive'
    archive.onclick = async () => {
        archive.disabled = true
        try {
            const response = container.archived
                ? await activateInventoryContainer(container.id)
                : await archiveInventoryContainer(container.id)
            successToast(response.message)
            await loadContainers()
        } catch (error) {
            archive.disabled = false
            errorToast(errorMessage(error))
        }
    }
    wrapper.appendChild(archive)

    return wrapper
}

async function loadContainers() {
    const response = await getInventoryContainers()
    containers = response.data
    gridApi.setGridOption("rowData", containers)
}

function parentName(parentId:number|undefined):string {
    if (!parentId) {
        return "None"
    }
    return containers.find(container => container.id === parentId)?.name ?? `#${parentId}`
}

function initialiseGrid() {
    const element = document.getElementById("inventory-containers-grid")
    if (!element) {
        throw new Error("Inventory containers grid was not found")
    }

    const options:GridOptions<InventoryContainer> = {
        animateRows: true,
        enableCellTextSelection: true,
        getRowId: params => String(params.data.id),
        defaultColDef: { sortable: true, filter: true, resizable: true },
        columnDefs: [
            { field: "name", headerName: "Name", minWidth: 220, flex: 2 },
            {
                headerName: "Parent",
                valueGetter: params => parentName(params.data?.parent_container_id),
                minWidth: 180,
                flex: 2,
            },
            { field: "description", headerName: "Description", minWidth: 260, flex: 3 },
            {
                field: "archived",
                headerName: "Status",
                valueFormatter: params => params.value ? "Archived" : "Active",
                minWidth: 120,
                flex: 1,
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
    const filter = document.getElementById("inventory-containers-filter") as HTMLInputElement|null
    filter?.addEventListener("input", () => {
        gridApi.setGridOption("quickFilterText", filter.value)
    })
}

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.getElementById("inventory-containers-page")
    canManageInventories = page?.dataset.canManageInventories === "true"

    try {
        initialiseGrid()
        await loadContainers()
    } catch (error) {
        console.error(error)
        errorToast(errorMessage(error))
    }
})
