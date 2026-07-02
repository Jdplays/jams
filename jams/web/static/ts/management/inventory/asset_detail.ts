import { createGrid, GridOptions } from "ag-grid-community"

import {
    getAllInventory,
    getInventoryAsset,
    getInventoryAssetLogs,
    getInventoryContainers,
    getInventoryItems,
    getRolesPublicInfo,
    printInventoryAssetLabel,
    removeInventoryAssetFromEntry,
    updateInventoryAssetState,
} from "@global/endpoints"
import {
    InventoryAsset,
    InventoryAssetLog,
    InventoryAssetState,
    Role,
    User,
} from "@global/endpoints_interfaces"
import {
    buildAttributeBadges,
    buildUserAvatar,
    errorToast,
    isTouchDevice,
    successToast,
} from "@global/helper"
import { addTooltipToElement, buildUserTooltip, hideTooltip } from "@global/tooltips"
import { CellClickedEvent, CellMouseOverEvent, ITooltipComp } from "ag-grid-community"

let currentAsset:InventoryAsset
let targetState:InventoryAssetState = "ACTIVE"
let rolesMap:Record<number, Partial<Role>> = {}
let activeTooltipElement:HTMLElement|null = null
let canManageInventories = false

function errorMessage(error:any):string {
    return error.responseJSON?.description
        ?? error.responseJSON?.message
        ?? "An unknown error occurred"
}

function setText(id:string, value:string) {
    const element = document.getElementById(id)
    if (element) {
        element.textContent = value
    }
}

function wasPrintedWithinLastDay(value?:string|null):boolean {
    if (!value) {
        return false
    }
    const printedAt = new Date(value).getTime()
    return Number.isFinite(printedAt) && Date.now() - printedAt < 24 * 60 * 60 * 1000
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

class UserToolTip implements ITooltipComp {
    private tooltipElement:HTMLDivElement

    init(params:any) {
        const user = params.value as Partial<User>|undefined
        if (!user) {
            return
        }

        this.tooltipElement = buildUserTooltip(user, rolesMap)
    }

    getGui() {
        return this.tooltipElement
    }
}

function showCustomTooltip(event:CellClickedEvent|CellMouseOverEvent) {
    if (!isTouchDevice()) {
        return
    }

    if (event.column.getColId() !== "user") {
        hideTooltip(activeTooltipElement)
        return
    }

    if (activeTooltipElement) {
        hideTooltip(activeTooltipElement)
    }

    const user = event.data?.user
    if (!user) {
        return
    }

    const target = event.event?.target as HTMLElement
    const tooltip = buildUserTooltip(user, rolesMap)
    addTooltipToElement(tooltip, target)
    activeTooltipElement = tooltip
}

function openStateModal(state:InventoryAssetState) {
    targetState = state
    const note = document.getElementById("asset-state-note") as HTMLTextAreaElement
    const label = document.getElementById("asset-state-note-label")!
    const hint = document.getElementById("asset-state-note-hint")!
    const title = document.getElementById("asset-state-modal-title")!
    const submit = document.getElementById("asset-state-submit")!

    note.value = ""
    note.required = state === "BROKEN"
    label.classList.toggle("required", note.required)

    if (state === "BROKEN") {
        title.textContent = "Mark asset as broken"
        submit.textContent = "Mark broken"
        hint.textContent = "Describe the fault, for example: HDMI port broken."
    } else if (state === "ARCHIVED") {
        title.textContent = "Archive asset"
        submit.textContent = "Archive"
        hint.textContent = "Optionally explain why this asset is being archived."
    } else {
        title.textContent = currentAsset.status === "BROKEN"
            ? "Mark asset as fixed"
            : "Activate asset"
        submit.textContent = currentAsset.status === "BROKEN" ? "Mark fixed" : "Activate"
        hint.textContent = "Optionally add a note about this change."
    }

    $("#asset-state-modal").modal("show")
}

function stateButton(
    label:string,
    icon:string,
    style:string,
    state:InventoryAssetState
):HTMLButtonElement {
    const button = document.createElement("button")
    button.type = "button"
    button.classList.add("btn", style)
    button.innerHTML = `<i class="ti ${icon} me-1"></i>${label}`
    button.onclick = () => openStateModal(state)
    return button
}

function renderStateActions(asset:InventoryAsset) {
    const actions = document.getElementById("asset-state-actions")
    if (!actions) {
        return
    }
    actions.replaceChildren()

    if (asset.status === "ARCHIVED") {
        actions.appendChild(stateButton("Activate", "ti-archive-off", "btn-success", "ACTIVE"))
        return
    }

    if (asset.status === "BROKEN") {
        actions.appendChild(stateButton("Mark fixed", "ti-tool", "btn-success", "ACTIVE"))
    } else {
        actions.appendChild(stateButton("Mark broken", "ti-alert-triangle", "btn-warning", "BROKEN"))
    }
    actions.appendChild(stateButton("Archive", "ti-archive", "btn-outline-danger", "ARCHIVED"))
}

async function submitStateChange(event:SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    if (!form.reportValidity()) {
        return
    }

    const submit = document.getElementById("asset-state-submit") as HTMLButtonElement
    const note = (document.getElementById("asset-state-note") as HTMLTextAreaElement).value.trim()
    submit.disabled = true
    try {
        const response = await updateInventoryAssetState(
            currentAsset.id,
            targetState,
            note || undefined
        )
        successToast(response.message)
        window.location.reload()
    } catch (error) {
        submit.disabled = false
        errorToast(errorMessage(error))
    }
}

function initialiseLogGrid(logs:InventoryAssetLog[]) {
    const element = document.getElementById("asset-logs-grid")
    if (!element) {
        throw new Error("Asset logs grid was not found")
    }

    const isMobile = window.matchMedia("(max-width: 767.98px)").matches
    const options:GridOptions<InventoryAssetLog> = {
        rowData: logs,
        animateRows: true,
        enableCellTextSelection: true,
        tooltipShowDelay: 0,
        tooltipInteraction: true,
        onCellClicked: showCustomTooltip,
        defaultColDef: { sortable: true, filter: true, resizable: true },
        columnDefs: [
            {
                field: "date",
                headerName: "Date",
                valueFormatter: params => params.value
                    ? new Date(params.value).toLocaleString()
                    : "",
                minWidth: 190,
                flex: 2,
            },
            { field: "message", headerName: "Message", minWidth: 240, flex: 3 },
            { field: "state", headerName: "State", minWidth: 120, flex: 1, hide: isMobile },
            { field: "note", headerName: "Note", minWidth: 220, flex: 2, hide: isMobile },
            {
                colId: "user",
                headerName: "User",
                valueGetter: params => params.data?.user ?? null,
                cellRenderer: (params:any) => {
                    const user = params.value as Partial<User>|null
                    if (!user) {
                        return "System"
                    }

                    const wrapper = document.createElement("a")
                    wrapper.href = `/private/users/${user.id}`
                    wrapper.classList.add(
                        "d-flex",
                        "align-items-center",
                        "gap-2",
                        "text-reset",
                        "text-decoration-none"
                    )

                    wrapper.appendChild(buildUserAvatar(user, 24))

                    const name = document.createElement("span")
                    name.textContent = user.display_name ?? `User #${params.data?.user_id}`
                    wrapper.appendChild(name)

                    const icon = document.createElement("i")
                    icon.classList.add("ti", "ti-chevron-right", "ms-auto", "text-secondary")
                    wrapper.appendChild(icon)

                    return wrapper
                },
                tooltipComponent: UserToolTip,
                tooltipValueGetter: params => params.data?.user ?? null,
                minWidth: 190,
                flex: 2,
                hide: isMobile,
            },
        ],
    }
    createGrid(element, options)
}

function removeAssetButton(asset:InventoryAsset, entryId:number):HTMLButtonElement {
    const button = document.createElement("button")
    button.type = "button"
    button.classList.add("btn", "btn-sm", "btn-outline-danger")
    button.innerHTML = '<i class="ti ti-trash me-1"></i>Remove'
    button.onclick = async () => {
        if (!window.confirm("Remove this asset from this inventory entry?")) {
            return
        }

        button.disabled = true
        try {
            const response = await removeInventoryAssetFromEntry(asset.id, entryId)
            successToast(response.message)
            window.location.reload()
        } catch (error) {
            button.disabled = false
            errorToast(errorMessage(error))
        }
    }
    return button
}

function renderInventoryHistory(asset:InventoryAsset) {
    const tbody = document.getElementById("asset-inventory-history")
    if (!tbody) {
        return
    }
    tbody.replaceChildren()

    const history = asset.inventory_entry_history ?? []
    if (!history.length) {
        const row = document.createElement("tr")
        const cell = document.createElement("td")
        cell.colSpan = canManageInventories ? 5 : 4
        cell.classList.add("text-secondary")
        cell.textContent = "This asset has not been linked to an inventory yet."
        row.appendChild(cell)
        tbody.appendChild(row)
        return
    }

    for (const item of history) {
        const row = document.createElement("tr")
        const inventoryCell = document.createElement("td")
        inventoryCell.textContent = item.inventory_name
        const dateCell = document.createElement("td")
        dateCell.textContent = item.inventory_date ?? ""
        const containerCell = document.createElement("td")
        containerCell.textContent = item.container_name ?? "No container"
        const linkedCell = document.createElement("td")
        linkedCell.textContent = item.linked_at
            ? new Date(item.linked_at).toLocaleString()
            : ""
        row.append(inventoryCell, dateCell, containerCell, linkedCell)
        if (canManageInventories) {
            const actionsCell = document.createElement("td")
            actionsCell.appendChild(
                removeAssetButton(asset, item.inventory_item_entry_id)
            )
            row.appendChild(actionsCell)
        }
        tbody.appendChild(row)
    }
}

async function initialisePage() {
    const page = document.getElementById("inventory-asset-detail-page")
    const assetId = Number(page?.dataset.assetId)
    if (!assetId) {
        throw new Error("Asset ID was not provided")
    }
    canManageInventories = page?.dataset.canManageInventories === "true"

    const [asset, logsResponse, itemResponse, containerResponse, inventoryResponse, roleResponse] = await Promise.all([
        getInventoryAsset(assetId),
        getInventoryAssetLogs(assetId),
        getInventoryItems(),
        getInventoryContainers(),
        getAllInventory(),
        getRolesPublicInfo(),
    ])
    currentAsset = asset
    rolesMap = Object.fromEntries(roleResponse.data.map(role => [role.id, role]))

    const item = itemResponse.data.find(candidate => candidate.id === asset.inventory_item_id)
    const latestHistory = latestInventoryHistory(asset)
    const container = latestHistory?.container_name
        ? undefined
        : containerResponse.data.find(candidate => candidate.id === asset.container_id)
    const inventory = latestHistory?.inventory_name
        ? undefined
        : inventoryResponse.data.find(candidate => candidate.id === asset.inventory_id)

    setText("asset-code", asset.asset_code)
    setText("asset-label", asset.label || "None")
    setText(
        "asset-last-printed",
        asset.last_printed_at
            ? new Date(asset.last_printed_at).toLocaleString()
            : "Never"
    )
    setText("asset-item-name", item?.name ?? `Item #${asset.inventory_item_id}`)
    setText("asset-status", asset.status)
    setText("asset-inventory", latestHistory?.inventory_name ?? inventory?.name ?? "Not assigned")
    setText("asset-container", latestHistory?.container_name ?? container?.name ?? "No container")
    setText("asset-archived", asset.archived ? "Yes" : "No")
    const attributes = document.getElementById("asset-attributes")
    attributes?.replaceChildren(
        buildAttributeBadges(asset.attributes, item?.attribute_schema)
    )
    setText("asset-notes", asset.notes || "None")
    renderStateActions(asset)
    renderInventoryHistory(asset)

    const printButton = document.getElementById(
        "print-asset-label"
    ) as HTMLButtonElement|null
    printButton?.addEventListener("click", async () => {
        let force = false
        if (wasPrintedWithinLastDay(currentAsset.last_printed_at)) {
            if (!window.confirm(
                "This label was printed within the last 24 hours. Are you sure you want to print it again?"
            )) {
                return
            }
            force = true
        }
        printButton.disabled = true

        try {
            const response = await printInventoryAssetLabel(asset.id, force)
            successToast(response.message)
            currentAsset.last_printed_at = new Date().toISOString()
            setText("asset-last-printed", new Date().toLocaleString())
        } catch (error) {
            errorToast(errorMessage(error))
        } finally {
            printButton.disabled = false
        }
    })
    document.getElementById("asset-state-form")
        ?.addEventListener("submit", submitStateChange)

    initialiseLogGrid(logsResponse.data)
}

document.addEventListener("DOMContentLoaded", () => {
    initialisePage().catch(error => {
        console.error(error)
        errorToast(errorMessage(error))
    })
})
