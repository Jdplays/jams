import TomSelect from "tom-select"
import { createGrid, GridApi, GridOptions } from "ag-grid-community"

import {
    createInventoryEntry,
    deleteInventoryEntry,
    getInventoryContainers,
    getInventoryDetail,
    getInventoryItems,
    getUser,
    lockInventory,
    previewInventoryEntryLabels,
    printInventoryEntryLabels,
    updateInventoryEntry,
    unlockInventory,
    validateInventoryEntryAssets,
} from "@global/endpoints"
import {
    CreateInventoryEntryRequest,
    InventoryContainer,
    InventoryDetail,
    InventoryItem,
    InventoryItemEntry,
} from "@global/endpoints_interfaces"
import { getLiveInventoryDetail } from "@global/sse_endpoints"
import { SSEManager } from "@global/sse_manager"
import {
    buildUserAvatar,
    buildAttributeBadges,
    debounce,
    errorToast,
    successToast,
} from "@global/helper"

let inventoryId:number
let canManageInventories = false
let entriesGridApi:GridApi<InventoryItemEntry>
let itemSelect:TomSelect
let inventoryItems:InventoryItem[] = []
let containers:InventoryContainer[] = []
let inventorySSE:SSEManager<InventoryDetail>
let assetValidationSequence = 0
let selectedContainerFilterId:number|null = null
let inventoryLocked = false
const MAX_INVENTORY_QUANTITY = 500

function canEditInventory():boolean {
    return canManageInventories && !inventoryLocked
}

function getErrorMessage(error:any):string {
    return error.responseJSON?.message
        ?? error.responseJSON?.description
        ?? "An unknown error occurred"
}

function labelCount(count:number):string {
    return `${count} ${count === 1 ? "label" : "labels"}`
}

type PrintModalChoice = "confirm"|"secondary"|"cancel"

interface PrintModalOptions {
    title:string
    message:string
    tone?:"primary"|"warning"
    icon?:"printer"|"alert-triangle"
    confirmText:string
    confirmClass?:string
    secondaryText?:string
    secondaryClass?:string
    cancelText?:string
}

function showPrintModal(options:PrintModalOptions):Promise<PrintModalChoice> {
    const tone = options.tone ?? "primary"
    const icon = options.icon ?? "printer"
    const modal = $("#inventory-print-modal")
    const status = document.getElementById("inventory-print-modal-status")!
    const iconElement = document.getElementById("inventory-print-modal-icon")!
    const confirm = document.getElementById(
        "inventory-print-modal-confirm"
    ) as HTMLButtonElement
    const secondary = document.getElementById(
        "inventory-print-modal-secondary"
    ) as HTMLButtonElement
    const secondaryContainer = document.getElementById(
        "inventory-print-modal-secondary-container"
    )!
    const cancel = document.getElementById(
        "inventory-print-modal-cancel"
    ) as HTMLButtonElement

    status.className = `modal-status bg-${tone}`
    iconElement.className = `ti ti-${icon} icon mb-2 text-${tone} icon-lg`
    document.getElementById("inventory-print-modal-title")!.textContent = options.title
    document.getElementById("inventory-print-modal-message")!.textContent = options.message
    confirm.textContent = options.confirmText
    confirm.className = `btn ${options.confirmClass ?? "btn-primary"} w-100`
    secondary.textContent = options.secondaryText ?? ""
    secondary.className = `btn ${options.secondaryClass ?? "btn-outline-warning"} w-100`
    secondaryContainer.classList.toggle("d-none", !options.secondaryText)
    cancel.textContent = options.cancelText ?? "Cancel"

    return new Promise(resolve => {
        let choice:PrintModalChoice = "cancel"
        confirm.onclick = () => {
            choice = "confirm"
            modal.modal("hide")
        }
        secondary.onclick = () => {
            choice = "secondary"
            modal.modal("hide")
        }
        modal.off(".inventoryPrint")
        modal.one("hidden.bs.modal.inventoryPrint", () => resolve(choice))
        modal.modal("show")
    })
}

function setText(id:string, value:string|number) {
    const element = document.getElementById(id)
    if (element) {
        element.textContent = String(value)
    }
}

async function renderInventoryHeader(detail:InventoryDetail) {
    const inventory = detail.inventory
    inventoryLocked = inventory.locked

    setText("inventory-name", inventory.name)
    setText("inventory-date", inventory.date)
    setText("inventory-entry-count", detail.summary.entry_count)
    setText("inventory-total-count", detail.summary.total_count)
    setText("inventory-asset-count", detail.summary.asset_count)

    const statusBadge = document.getElementById("inventory-status")
    if (statusBadge) {
        statusBadge.className = "badge"
        const statusClass = detail.status === "Active"
            ? "bg-green-lt"
            : detail.status === "Archived"
                ? "bg-red-lt"
                : "bg-secondary-lt"
        statusBadge.classList.add(statusClass)
        statusBadge.textContent = detail.status
    }

    const lockButton = document.getElementById(
        "inventory-lock-button"
    ) as HTMLButtonElement|null
    if (lockButton) {
        lockButton.className = inventoryLocked
            ? "btn btn-sm btn-outline-primary"
            : "btn btn-sm btn-outline-secondary"
        lockButton.innerHTML = inventoryLocked
            ? '<i class="ti ti-lock-open me-1"></i><span>Unlock inventory</span>'
            : '<i class="ti ti-lock me-1"></i><span>Lock inventory</span>'
    }

    document.getElementById("inventory-locked-notice")
        ?.classList.toggle("d-none", !inventoryLocked)
    document.getElementById("inventory-primary-action")
        ?.classList.toggle("d-none", inventoryLocked)
    document.getElementById("inventory-entry-panel")
        ?.classList.toggle("d-none", inventoryLocked)
    document.querySelector<HTMLButtonElement>(".jolt-status-widget .jolt-test-print")
        ?.classList.toggle("d-none", inventoryLocked)
    if (inventoryLocked) {
        setEntryFormOpen(false)
    }
    entriesGridApi?.refreshCells({ force: true })

    const coordinatorContainer = document.getElementById("inventory-coordinator")
    if (!coordinatorContainer) {
        return
    }

    coordinatorContainer.replaceChildren()

    if (inventory.coordinator_id === undefined || inventory.coordinator_id === null) {
        coordinatorContainer.textContent = "No coordinator"
        return
    }

    try {
        const coordinator = await getUser(inventory.coordinator_id)
        const avatar = buildUserAvatar(coordinator, 20)
        avatar.classList.add("me-2")

        const text = document.createElement("span")
        text.append("Coordinated by ")

        const name = document.createElement("strong")
        name.classList.add("text-body")
        name.textContent = coordinator.display_name

        text.appendChild(name)
        coordinatorContainer.classList.add("d-flex", "align-items-center")
        coordinatorContainer.append(avatar, text)
    } catch (error) {
        coordinatorContainer.textContent = "Coordinator unavailable"
    }
}

function renderInventoryDetail(detail:InventoryDetail) {
    renderInventoryHeader(detail)
    entriesGridApi?.setGridOption("rowData", detail.entries)
    renderContainerSummary(detail.entries)
}

function setEntryFormOpen(open:boolean) {
    const page = document.getElementById("inventory-detail-page")
    const panel = document.getElementById("inventory-entry-panel")
    panel?.classList.toggle("inventory-entry-panel-closed", !open)
    page?.classList.toggle("entry-mode", open)

    if (open) {
        panel?.scrollIntoView({ behavior: "smooth", block: "start" })
        window.setTimeout(() => itemSelect?.focus(), 250)
    }
}

function changeEntryFormQuantity(amount:number) {
    const input = document.getElementById("inventory-entry-quantity") as HTMLInputElement
    if (input.readOnly) {
        return
    }
    const current = Number(input.value) || 1
    input.value = String(Math.min(
        MAX_INVENTORY_QUANTITY,
        Math.max(1, current + amount)
    ))
    input.dispatchEvent(new Event("input", { bubbles: true }))
}

function filterEntriesForContainer(containerId:number, containerName:string) {
    selectedContainerFilterId = containerId
    entriesGridApi.onFilterChanged()
    const status = document.getElementById("inventory-container-filter-status")
    status?.classList.remove("d-none")
    setText("inventory-container-filter-text", `Showing entries in ${containerName}.`)
    document.getElementById("inventory-entries-card")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function clearContainerFilter() {
    selectedContainerFilterId = null
    entriesGridApi.onFilterChanged()
    document.getElementById("inventory-container-filter-status")
        ?.classList.add("d-none")
}

function renderContainerSummary(entries:InventoryItemEntry[]) {
    const rows = document.getElementById("inventory-container-summary-rows")
    if (!rows) {
        return
    }

    const summaries = new Map<number, {container:InventoryContainer, entryCount:number, itemCount:number}>()
    for (const entry of entries) {
        if (!entry.container_id || !entry.container) {
            continue
        }
        const summary = summaries.get(entry.container_id) ?? {
            container: entry.container,
            entryCount: 0,
            itemCount: 0,
        }
        summary.entryCount += 1
        summary.itemCount += entry.quantity
        summaries.set(entry.container_id, summary)
    }

    const tableRows = Array.from(summaries.values())
        .sort((left, right) => left.container.name.localeCompare(right.container.name))
        .map(summary => {
            const row = document.createElement("tr")
            const name = document.createElement("td")
            name.textContent = summary.container.name
            const entryCount = document.createElement("td")
            entryCount.classList.add("text-end")
            entryCount.textContent = String(summary.entryCount)
            const itemCount = document.createElement("td")
            itemCount.classList.add("text-end")
            itemCount.textContent = String(summary.itemCount)
            const actions = document.createElement("td")
            actions.classList.add("text-end")
            const wrapper = document.createElement("div")
            wrapper.classList.add("btn-list", "flex-nowrap", "justify-content-end")
            const viewEntries = document.createElement("button")
            viewEntries.type = "button"
            viewEntries.classList.add("btn", "btn-sm", "btn-outline-secondary")
            viewEntries.innerHTML = '<i class="ti ti-filter me-1"></i>View entries'
            viewEntries.onclick = () => filterEntriesForContainer(
                summary.container.id,
                summary.container.name
            )
            const view = document.createElement("a")
            view.classList.add("btn", "btn-sm", "btn-outline-primary")
            view.href = `/private/management/inventory/containers/${summary.container.id}`
            view.innerHTML = '<i class="ti ti-eye me-1"></i>View'
            wrapper.append(viewEntries, view)
            actions.appendChild(wrapper)
            row.append(name, entryCount, itemCount, actions)
            return row
        })

    rows.replaceChildren(...tableRows)
    document.getElementById("inventory-container-summary-empty")
        ?.classList.toggle("d-none", tableRows.length > 0)
}

function buildQuantityEditor(entry:InventoryItemEntry):HTMLElement {
    if (!canEditInventory() || entry.item?.is_asset) {
        const text = document.createElement("span")
        text.textContent = String(entry.quantity)
        if (entry.item?.is_asset) {
            text.title = "Asset-tracked quantity is changed by adding or removing assets"
        }
        return text
    }

    const wrapper = document.createElement("div")
    wrapper.classList.add("inventory-entry-quantity-editor")
    const decrement = document.createElement("button")
    decrement.type = "button"
    decrement.classList.add("btn", "btn-sm", "btn-outline-secondary")
    decrement.innerHTML = '<i class="ti ti-minus"></i>'
    const input = document.createElement("input")
    input.classList.add("form-control", "form-control-sm")
    input.type = "number"
    input.min = "0"
    input.inputMode = "numeric"
    input.value = String(entry.quantity)
    const increment = document.createElement("button")
    increment.type = "button"
    increment.classList.add("btn", "btn-sm", "btn-outline-secondary")
    increment.innerHTML = '<i class="ti ti-plus"></i>'

    const save = async (quantity:number) => {
        quantity = Math.max(0, quantity)
        wrapper.querySelectorAll("button, input").forEach(
            element => (element as HTMLButtonElement|HTMLInputElement).disabled = true
        )
        try {
            const updated = await updateInventoryEntry(entry.id, { quantity })
            entry.quantity = updated.quantity
            input.value = String(updated.quantity)
            successToast("Entry quantity updated")
        } catch (error) {
            input.value = String(entry.quantity)
            errorToast(getErrorMessage(error))
        } finally {
            wrapper.querySelectorAll("button, input").forEach(
                element => (element as HTMLButtonElement|HTMLInputElement).disabled = false
            )
        }
    }
    decrement.onclick = () => save(entry.quantity - 1)
    increment.onclick = () => save(entry.quantity + 1)
    input.onchange = () => save(Number(input.value))
    wrapper.append(decrement, input, increment)
    return wrapper
}

function buildContainerSelect(entry:InventoryItemEntry):HTMLSelectElement {
    const select = document.createElement("select")
    select.classList.add("form-select", "form-select-sm")

    const noContainerOption = document.createElement("option")
    noContainerOption.value = ""
    noContainerOption.textContent = "No container"
    select.appendChild(noContainerOption)

    for (const container of containers) {
        if (container.archived) {
            continue
        }

        const option = document.createElement("option")
        option.value = String(container.id)
        option.textContent = container.name
        option.selected = container.id === entry.container_id
        select.appendChild(option)
    }

    select.onchange = async () => {
        select.disabled = true

        try {
            await updateInventoryEntry(entry.id, {
                container_id: select.value ? Number(select.value) : null,
            })
            successToast("Entry container updated")
        } catch (error) {
            select.disabled = false
            errorToast(getErrorMessage(error))
        }
    }

    return select
}

function buildEntryActions(entry:InventoryItemEntry):HTMLElement {
    const wrapper = document.createElement("div")
    wrapper.classList.add("btn-list", "flex-wrap")

    const viewAssets = document.createElement("a")
    viewAssets.classList.add(
        "btn",
        "btn-sm",
        entry.item?.is_asset ? "btn-outline-primary" : "btn-outline-secondary"
    )
    if (entry.item?.is_asset) {
        viewAssets.href = `/private/management/inventory/assets?entry_id=${entry.id}`
    } else {
        viewAssets.classList.add("disabled")
        viewAssets.setAttribute("aria-disabled", "true")
        viewAssets.tabIndex = -1
    }
    viewAssets.innerHTML = '<i class="ti ti-barcode me-1"></i>View assets'
    wrapper.appendChild(viewAssets)

    if (canEditInventory()) {
    const printLabels = document.createElement("button")
    printLabels.type = "button"
    printLabels.classList.add("btn", "btn-sm", "btn-outline-secondary")
    printLabels.disabled = entry.asset_count === 0
    printLabels.innerHTML = '<i class="ti ti-printer me-1"></i>Print labels'
    printLabels.onclick = async () => {
        printLabels.disabled = true

        try {
            const previewResponse = await previewInventoryEntryLabels(entry.id)
            const preview = previewResponse.data
            const queuedMessage = preview.queued_count
                ? ` ${labelCount(preview.queued_count)} already in the queue will be skipped.`
                : ""
            const confirmation = await showPrintModal({
                title: `Print ${labelCount(preview.total_count)}?`,
                message: `Are you sure you want to continue?${queuedMessage}`,
                confirmText: "Print labels",
            })
            if (confirmation !== "confirm") {
                return
            }

            let recentMode:"reject"|"skip"|"include" = "reject"
            if (preview.recent_count) {
                const recentConfirmation = await showPrintModal({
                    title: `${labelCount(preview.recent_count)} recently printed`,
                    message: (
                        `${preview.recent_count} of these labels were printed `
                        + "within the last hour. What would you like to do?"
                    ),
                    tone: "warning",
                    icon: "alert-triangle",
                    confirmText: "Print remaining",
                    secondaryText: "Reprint all",
                })
                if (recentConfirmation === "confirm") {
                    recentMode = "skip"
                } else if (recentConfirmation === "secondary") {
                    recentMode = "include"
                } else {
                    return
                }
            }

            const response = await printInventoryEntryLabels(
                entry.id,
                recentMode
            )
            successToast(response.message)
        } catch (error) {
            errorToast(getErrorMessage(error))
        } finally {
            printLabels.disabled = entry.asset_count === 0
        }
    }
    wrapper.appendChild(printLabels)
    }

    if (canEditInventory()) {
        const remove = document.createElement("button")
        remove.type = "button"
        remove.classList.add("btn", "btn-sm", "btn-outline-danger")
        remove.innerHTML = '<i class="ti ti-trash me-1"></i>Remove'
        remove.onclick = async () => {
            if (!window.confirm("Remove this entry from the inventory?")) {
                return
            }

            remove.disabled = true
            try {
                const response = await deleteInventoryEntry(entry.id)
                successToast(response.message)
                entriesGridApi.applyTransaction({ remove: [entry] })
            } catch (error) {
                remove.disabled = false
                errorToast(getErrorMessage(error))
            }
        }
        wrapper.appendChild(remove)
    }

    return wrapper
}

function initialiseEntriesGrid() {
    const gridElement = document.getElementById("inventory-entries-grid")
    if (!gridElement) {
        throw new Error("Inventory entries grid was not found")
    }

    const isMobile = window.matchMedia("(max-width: 767.98px)").matches
    const gridOptions:GridOptions<InventoryItemEntry> = {
        domLayout: "autoHeight",
        animateRows: true,
        enableCellTextSelection: true,
        suppressMovableColumns: true,
        getRowId: params => String(params.data.id),
        isExternalFilterPresent: () => selectedContainerFilterId !== null,
        doesExternalFilterPass: node => (
            selectedContainerFilterId === null
            || node.data?.container_id === selectedContainerFilterId
        ),
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true,
        },
        columnDefs: [
            {
                headerName: "Item",
                valueGetter: params => params.data?.item?.name ?? "Unknown item",
                minWidth: 220,
                flex: 2,
            },
            {
                headerName: "Type",
                valueGetter: params => params.data?.item?.type ?? "",
                minWidth: 120,
                flex: 1,
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
                flex: 1,
            },
            {
                headerName: "Container",
                valueGetter: params => params.data?.container?.name ?? "No container",
                cellRenderer: (params:any) => {
                    if (!params.data || !canEditInventory()) {
                        return params.value
                    }
                    return buildContainerSelect(params.data)
                },
                minWidth: 200,
                flex: 1,
            },
            {
                field: "attributes",
                headerName: "Attributes",
                cellRenderer: (params:any) => buildAttributeBadges(
                    params.value,
                    params.data?.item?.attribute_schema
                ),
                minWidth: 200,
                flex: 2,
                hide: isMobile,
            },
            {
                headerName: "Actions",
                sortable: false,
                filter: false,
                cellRenderer: (params:any) => params.data
                    ? buildEntryActions(params.data)
                    : "",
                minWidth: canManageInventories ? 360 : 250,
                flex: 2,
            },
        ],
    }

    entriesGridApi = createGrid(gridElement, gridOptions)

    const filterInput = document.getElementById(
        "inventory-entry-filter"
    ) as HTMLInputElement|null

    filterInput?.addEventListener("input", () => {
        entriesGridApi.setGridOption("quickFilterText", filterInput.value)
    })
}

function updateEntryFormForSelectedItem() {
    const selectedItem = inventoryItems.find(
        item => item.id === Number(itemSelect.getValue())
    )
    const assetNotice = document.getElementById("inventory-asset-selection")
    const assetMessage = document.getElementById("inventory-asset-tracking-message")
    assetNotice?.classList.toggle("d-none", !selectedItem?.is_asset)
    if (assetMessage && selectedItem?.is_asset) {
        const preferredInput = document.querySelector<HTMLInputElement>(
            '.inventory-asset-mode[value="create"]'
        )
        if (preferredInput) {
            preferredInput.checked = true
        }
        assetMessage.textContent = `${selectedItem.asset_code_prefix}-xxx codes will be generated automatically.`
    }
    updateAssetSelectionForm()
    renderEntryAttributeFields(selectedItem)
}

function selectedRadioValue(selector:string):string|undefined {
    return document.querySelector<HTMLInputElement>(`${selector}:checked`)?.value
}

function parseExistingAssetCodes():string[] {
    const input = document.getElementById(
        "inventory-existing-asset-codes"
    ) as HTMLTextAreaElement
    return input.value
        .split(/[\s,]+/)
        .map(value => value.trim())
        .filter(Boolean)
}

function renderExistingAssetValidation(
    type:"idle"|"pending"|"success"|"error",
    message:string,
    details:string[] = []
) {
    const element = document.getElementById("inventory-existing-asset-validation")
    if (!element) {
        return
    }

    element.className = "alert mt-3 mb-0"
    element.classList.toggle("d-none", type === "idle")
    const colour = type === "success"
        ? "alert-success"
        : type === "error"
            ? "alert-danger"
            : "alert-secondary"
    element.classList.add(colour)

    element.replaceChildren()
    const messageElement = document.createElement("div")
    messageElement.textContent = message
    element.appendChild(messageElement)

    if (details.length) {
        const list = document.createElement("ul")
        list.classList.add("mb-0", "mt-2")
        for (const detail of details) {
            const item = document.createElement("li")
            item.textContent = detail
            list.appendChild(item)
        }
        element.appendChild(list)
    }
}

function getSelectedItem():InventoryItem|undefined {
    return inventoryItems.find(
        item => item.id === Number(itemSelect?.getValue())
    )
}

function updateAssetSelectionForm() {
    const selectedItem = getSelectedItem()
    const quantityInput = document.getElementById(
        "inventory-entry-quantity"
    ) as HTMLInputElement
    const existingContainer = document.getElementById("inventory-existing-assets")
    const codesContainer = document.getElementById(
        "inventory-existing-asset-codes-container"
    )
    const rangeContainer = document.getElementById(
        "inventory-existing-asset-range-container"
    )
    const codesInput = document.getElementById(
        "inventory-existing-asset-codes"
    ) as HTMLTextAreaElement
    const startInput = document.getElementById(
        "inventory-existing-asset-start-index"
    ) as HTMLInputElement

    const assetCodePrefix = selectedItem?.asset_code_prefix ?? "ABC"
    codesInput.placeholder = (
        `1, 2, 5 or ${assetCodePrefix}-001, `
        + `${assetCodePrefix}-002, ${assetCodePrefix}-005`
    )

    const assetMode = selectedRadioValue(".inventory-asset-mode") ?? "create"
    const selectionMode = selectedRadioValue(
        ".inventory-existing-asset-selection"
    ) ?? "codes"
    const useExisting = Boolean(selectedItem?.is_asset && assetMode === "existing")
    const useCodes = useExisting && selectionMode === "codes"
    const useRange = useExisting && selectionMode === "range"

    existingContainer?.classList.toggle("d-none", !useExisting)
    codesContainer?.classList.toggle("d-none", !useCodes)
    rangeContainer?.classList.toggle("d-none", !useRange)
    codesInput.required = useCodes
    startInput.required = useRange
    quantityInput.readOnly = useCodes
    document.querySelectorAll<HTMLButtonElement>(
        "#decrement-entry-quantity, #increment-entry-quantity"
    ).forEach(button => button.disabled = useCodes)

    if (useCodes) {
        quantityInput.value = String(parseExistingAssetCodes().length || 1)
    }

    if (!useExisting) {
        renderExistingAssetValidation("idle", "")
    }

    const message = document.getElementById("inventory-asset-tracking-message")
    if (message && selectedItem?.is_asset) {
        message.textContent = useExisting
            ? "Existing assets must be active, match this variant, and not already be in this inventory."
            : `${selectedItem.asset_code_prefix}-xxx codes will be generated automatically.`
    }
    renderNewAssetLabelFields()
}

function renderNewAssetLabelFields() {
    const wrapper = document.getElementById("inventory-new-asset-labels")
    const fields = document.getElementById("inventory-new-asset-label-fields")
    if (!wrapper || !fields) {
        return
    }

    const item = getSelectedItem()
    const assetMode = selectedRadioValue(".inventory-asset-mode") ?? "create"
    const showLabels = Boolean(item?.is_asset && item.needs_label && assetMode === "create")
    wrapper.classList.toggle("d-none", !showLabels)
    if (!showLabels) {
        ;(document.getElementById(
            "inventory-entry-quantity"
        ) as HTMLInputElement).setCustomValidity("")
        fields.replaceChildren()
        return
    }

    const oldValues = Array.from(
        fields.querySelectorAll<HTMLInputElement>(".inventory-new-asset-label")
    ).map(input => input.value)
    const quantityInput = document.getElementById(
        "inventory-entry-quantity"
    ) as HTMLInputElement
    const quantity = Math.max(1, Number(quantityInput.value) || 1)
    if (quantity > MAX_INVENTORY_QUANTITY) {
        quantityInput.setCustomValidity(
            `Quantity cannot exceed ${MAX_INVENTORY_QUANTITY}`
        )
        fields.replaceChildren()
        return
    }
    quantityInput.setCustomValidity("")
    const rows:HTMLElement[] = []
    for (let index = 0; index < quantity; index += 1) {
        const column = document.createElement("div")
        column.classList.add("col-12", "col-md-6")
        const label = document.createElement("label")
        label.classList.add("form-label", "required")
        label.textContent = `Asset ${index + 1}`
        const input = document.createElement("input")
        input.classList.add("form-control", "inventory-new-asset-label")
        input.maxLength = 255
        input.placeholder = "e.g. Upstairs"
        input.required = true
        input.value = oldValues[index] ?? ""
        column.append(label, input)
        rows.push(column)
    }
    fields.replaceChildren(...rows)
}

function buildEntryRequest():CreateInventoryEntryRequest|null {
    const selectedItem = getSelectedItem()

    if (!selectedItem) {
        errorToast("Select an inventory item")
        return null
    }

    const quantityInput = document.getElementById(
        "inventory-entry-quantity"
    ) as HTMLInputElement
    const containerSelect = document.getElementById(
        "inventory-container-select"
    ) as HTMLSelectElement

    const quantity = Number(quantityInput.value)
    if (quantity > MAX_INVENTORY_QUANTITY) {
        errorToast(`Quantity cannot exceed ${MAX_INVENTORY_QUANTITY}`)
        return null
    }

    const data:CreateInventoryEntryRequest = {
        inventory_item_id: selectedItem.id,
        container_id: containerSelect.value
            ? Number(containerSelect.value)
            : null,
        quantity,
    }

    const attributes = collectEntryAttributes()
    if (Object.keys(attributes).length) {
        data.attributes = attributes
    }

    if (selectedItem.is_asset) {
        const assetMode = selectedRadioValue(
            ".inventory-asset-mode"
        ) as "create"|"existing"
        data.asset_mode = assetMode

        if (assetMode === "create" && selectedItem.needs_label) {
            data.asset_labels = Array.from(
                document.querySelectorAll<HTMLInputElement>(
                    "#inventory-new-asset-label-fields .inventory-new-asset-label"
                )
            ).map(input => input.value.trim())
        }

        if (assetMode === "existing") {
            const selectionMode = selectedRadioValue(
                ".inventory-existing-asset-selection"
            ) as "codes"|"range"
            data.existing_asset_selection = selectionMode

            if (selectionMode === "codes") {
                const codes = parseExistingAssetCodes()
                if (!codes.length) {
                    renderExistingAssetValidation(
                        "error",
                        "Enter at least one existing asset number."
                    )
                    return null
                }
                if (codes.length > MAX_INVENTORY_QUANTITY) {
                    renderExistingAssetValidation(
                        "error",
                        `Select no more than ${MAX_INVENTORY_QUANTITY} assets.`
                    )
                    return null
                }
                data.existing_asset_codes = codes
                data.quantity = codes.length
            } else {
                data.asset_start_index = Number((document.getElementById(
                    "inventory-existing-asset-start-index"
                ) as HTMLInputElement).value)
            }
        }
    }

    return data
}

async function validateExistingAssetSelection(showPending = true):Promise<boolean> {
    const selectedItem = getSelectedItem()
    const assetMode = selectedRadioValue(".inventory-asset-mode")

    if (!selectedItem?.is_asset || assetMode !== "existing") {
        return true
    }

    const data = buildEntryRequest()
    if (!data) {
        return false
    }

    const sequence = ++assetValidationSequence
    if (showPending) {
        renderExistingAssetValidation("pending", "Checking selected assets…")
    }

    try {
        const response = await validateInventoryEntryAssets(inventoryId, data)
        if (sequence !== assetValidationSequence) {
            return response.data.valid
        }

        if (response.data.valid) {
            renderExistingAssetValidation(
                "success",
                `${response.data.asset_codes.length} asset(s) can be added to this inventory.`
            )
            return true
        }

        renderExistingAssetValidation(
            "error",
            "Some selected assets cannot be used.",
            response.data.invalid_assets.map(
                item => `${item.asset_code}: ${item.reason}`
            )
        )
        return false
    } catch (error) {
        if (sequence === assetValidationSequence) {
            renderExistingAssetValidation("error", getErrorMessage(error))
        }
        return false
    }
}

const validateExistingAssetSelectionDebounced = debounce(
    () => validateExistingAssetSelection(false),
    350
)

function renderEntryAttributeFields(item?:InventoryItem) {
    const wrapper = document.getElementById("inventory-entry-attributes")
    const fields = document.getElementById("inventory-entry-attribute-fields")
    if (!wrapper || !fields) {
        return
    }

    fields.replaceChildren()
    const attributes = item?.attribute_schema?.attributes
        ?.filter(attribute => attribute.active !== false) ?? []
    wrapper.classList.toggle("d-none", attributes.length === 0)

    for (const attribute of attributes) {
        const column = document.createElement("div")
        column.classList.add("col-12", "col-md-6")

        if (attribute.type === "select") {
            const label = document.createElement("label")
            label.classList.add("form-label")
            if (attribute.required) {
                label.classList.add("required")
            }
            label.textContent = attribute.label

            const select = document.createElement("select")
            select.classList.add("form-select")
            select.dataset.attributeKey = attribute.key
            select.dataset.attributeType = attribute.type
            select.required = attribute.required

            const empty = document.createElement("option")
            empty.value = ""
            empty.textContent = attribute.required ? "Select a value…" : "Not specified"
            select.appendChild(empty)

            for (const option of attribute.values ?? []) {
                if (option.active === false) {
                    continue
                }
                const element = document.createElement("option")
                element.value = option.key
                element.textContent = option.label
                select.appendChild(element)
            }
            column.append(label, select)
        } else {
            const switchLabel = document.createElement("label")
            switchLabel.classList.add("form-check", "form-switch", "mt-md-4", "pt-md-2")

            const input = document.createElement("input")
            input.classList.add("form-check-input")
            input.type = "checkbox"
            input.dataset.attributeKey = attribute.key
            input.dataset.attributeType = attribute.type

            const text = document.createElement("span")
            text.classList.add("form-check-label")
            text.textContent = attribute.label
            switchLabel.append(input, text)
            column.appendChild(switchLabel)
        }

        fields.appendChild(column)
    }
}

function collectEntryAttributes():Record<string, unknown> {
    const attributes:Record<string, unknown> = {}
    const fields = Array.from(
        document.querySelectorAll<HTMLInputElement|HTMLSelectElement>(
            "#inventory-entry-attribute-fields [data-attribute-key]"
        )
    )

    for (const field of fields) {
        const key = field.dataset.attributeKey!
        if (field.dataset.attributeType === "boolean") {
            attributes[key] = (field as HTMLInputElement).checked
        } else if (field.value) {
            attributes[key] = field.value
        }
    }

    return attributes
}

async function loadItems() {
    const response = await getInventoryItems()
    inventoryItems = response.data.filter(item => !item.archived)

    const selectElement = document.getElementById(
        "inventory-item-select"
    ) as HTMLSelectElement|null
    if (!selectElement) {
        return
    }

    itemSelect = new TomSelect(selectElement, {
        valueField: "id",
        labelField: "name",
        searchField: ["name", "description"],
        options: inventoryItems,
        create: false,
        maxItems: 1,
        placeholder: "Search inventory items…",
        render: {
            option: (item:InventoryItem, escape:(value:string) => string) => {
                const description = item.description
                    ? `<div class="text-secondary small">${escape(item.description)}</div>`
                    : ""
                return `<div><div>${escape(item.name)}</div>${description}</div>`
            },
            item: (item:InventoryItem, escape:(value:string) => string) => {
                return `<div>${escape(item.name)}</div>`
            },
        },
        onChange: updateEntryFormForSelectedItem,
    })
}

function populateContainerSelect() {
    const select = document.getElementById(
        "inventory-container-select"
    ) as HTMLSelectElement|null

    if (!select) {
        return
    }

    const selectedValue = select.value
    select.replaceChildren()

    const noContainerOption = document.createElement("option")
    noContainerOption.value = ""
    noContainerOption.textContent = "No container"
    select.appendChild(noContainerOption)

    for (const container of containers) {
        if (container.archived) {
            continue
        }

        const option = document.createElement("option")
        option.value = String(container.id)
        option.textContent = container.name
        select.appendChild(option)
    }

    select.value = selectedValue
}

async function loadContainers() {
    const response = await getInventoryContainers()
    containers = response.data
    populateContainerSelect()
    entriesGridApi?.refreshCells({ force: true })
}

async function offerToPrintNewAssetLabels(entry:InventoryItemEntry) {
    const newAssets = entry.new_assets ?? []
    if (!newAssets.length) {
        return
    }

    const confirmation = await showPrintModal({
        title: `Print ${labelCount(newAssets.length)} now?`,
        message: "The new assets were added successfully. Print their labels now?",
        confirmText: "Print labels",
        cancelText: "Not now",
    })
    if (confirmation !== "confirm") {
        return
    }

    try {
        const response = await printInventoryEntryLabels(
            entry.id,
            "reject",
            newAssets.map(asset => asset.id)
        )
        successToast(response.message)
    } catch (error) {
        errorToast(
            `Assets were added, but labels were not queued: ${getErrorMessage(error)}`
        )
    }
}

async function submitInventoryEntry(event:SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    if (!form.reportValidity()) {
        return
    }

    const selectedItem = getSelectedItem()

    if (!selectedItem) {
        errorToast("Select an inventory item")
        return
    }

    const quantityInput = document.getElementById(
        "inventory-entry-quantity"
    ) as HTMLInputElement
    const submitButton = (event.currentTarget as HTMLFormElement)
        .querySelector('button[type="submit"]') as HTMLButtonElement

    const data = buildEntryRequest()
    if (!data) {
        return
    }

    submitButton.disabled = true

    try {
        const assetsAreValid = await validateExistingAssetSelection(true)
        if (!assetsAreValid) {
            errorToast("Fix the selected assets before adding this entry")
            return
        }

        const response = await createInventoryEntry(inventoryId, data)
        successToast(response.message)
        if (selectedItem.needs_label && response.data.new_assets?.length) {
            await offerToPrintNewAssetLabels(response.data)
        }
        quantityInput.value = "1"
        ;(document.getElementById(
            "inventory-existing-asset-codes"
        ) as HTMLTextAreaElement).value = ""
        ;(document.getElementById(
            "inventory-existing-asset-start-index"
        ) as HTMLInputElement).value = "1"
        document.getElementById("inventory-new-asset-label-fields")
            ?.replaceChildren()
        renderExistingAssetValidation("idle", "")
        updateAssetSelectionForm()
        renderEntryAttributeFields(selectedItem)
    } catch (error) {
        errorToast(getErrorMessage(error))
    } finally {
        submitButton.disabled = false
    }
}

async function toggleInventoryLock() {
    const button = document.getElementById(
        "inventory-lock-button"
    ) as HTMLButtonElement|null
    if (!button) {
        return
    }

    const action = inventoryLocked ? "unlock" : "lock"
    if (!window.confirm(`Are you sure you want to ${action} this inventory?`)) {
        return
    }

    button.disabled = true
    try {
        const response = inventoryLocked
            ? await unlockInventory(inventoryId)
            : await lockInventory(inventoryId)
        successToast(response.message)
        const detail = await getInventoryDetail(inventoryId)
        renderInventoryDetail(detail.data)
    } catch (error) {
        errorToast(getErrorMessage(error))
    } finally {
        button.disabled = false
    }
}

async function initialisePage() {
    const page = document.getElementById("inventory-detail-page")
    if (!page) {
        throw new Error("Inventory detail page container was not found")
    }

    inventoryId = Number(page.dataset.inventoryId)
    canManageInventories = page.dataset.canManageInventories === "true"

    initialiseEntriesGrid()

    document.getElementById("inventory-lock-button")
        ?.addEventListener("click", toggleInventoryLock)

    if (canManageInventories) {
        await Promise.all([loadItems(), loadContainers()])

        document.getElementById("open-entry-form")
            ?.addEventListener("click", () => setEntryFormOpen(true))
        document.getElementById("close-entry-form")
            ?.addEventListener("click", () => setEntryFormOpen(false))
        document.getElementById("decrement-entry-quantity")
            ?.addEventListener("click", () => changeEntryFormQuantity(-1))
        document.getElementById("increment-entry-quantity")
            ?.addEventListener("click", () => changeEntryFormQuantity(1))
        document.getElementById("add-inventory-entry-form")
            ?.addEventListener("submit", submitInventoryEntry)
        document.querySelectorAll<HTMLInputElement>(
            ".inventory-asset-mode, .inventory-existing-asset-selection"
        ).forEach(input => input.addEventListener("change", () => {
            updateAssetSelectionForm()
            validateExistingAssetSelectionDebounced()
        }))
        document.getElementById("inventory-existing-asset-codes")
            ?.addEventListener("input", () => {
                updateAssetSelectionForm()
                validateExistingAssetSelectionDebounced()
            })
        document.getElementById("inventory-existing-asset-start-index")
            ?.addEventListener("input", () => validateExistingAssetSelectionDebounced())
        document.getElementById("inventory-entry-quantity")
            ?.addEventListener("input", () => {
                renderNewAssetLabelFields()
                validateExistingAssetSelectionDebounced()
            })
        document.getElementById("inventory-entry-attribute-fields")
            ?.addEventListener("change", () => validateExistingAssetSelectionDebounced())
    } else {
        await loadContainers()
    }

    const detail = await getInventoryDetail(inventoryId)
    renderInventoryDetail(detail.data)

    document.getElementById("clear-inventory-container-filter")
        ?.addEventListener("click", clearContainerFilter)

    inventorySSE = getLiveInventoryDetail(inventoryId)
    inventorySSE.onUpdate(renderInventoryDetail)
}

document.addEventListener("DOMContentLoaded", () => {
    initialisePage().catch(error => {
        console.error(error)
        errorToast(getErrorMessage(error))
    })
})

window.addEventListener("beforeunload", () => {
    inventorySSE?.stop()
})
