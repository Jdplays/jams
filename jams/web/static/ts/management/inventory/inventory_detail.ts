import TomSelect from "tom-select"
import { createGrid, GridApi, GridOptions } from "ag-grid-community"

import {
    createInventoryEntry,
    deleteInventoryEntry,
    getInventoryContainers,
    getInventoryDetail,
    getInventoryItems,
    getUser,
    updateInventoryEntry,
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

function getErrorMessage(error:any):string {
    return error.responseJSON?.message
        ?? error.responseJSON?.description
        ?? "An unknown error occurred"
}

function setText(id:string, value:string|number) {
    const element = document.getElementById(id)
    if (element) {
        element.textContent = String(value)
    }
}

async function renderInventoryHeader(detail:InventoryDetail) {
    const inventory = detail.inventory

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
    wrapper.classList.add("btn-list", "flex-nowrap")

    const viewAssets = document.createElement("a")
    viewAssets.classList.add("btn", "btn-sm", "btn-outline-primary")
    viewAssets.href = `/private/management/inventory/assets?entry_id=${entry.id}`
    viewAssets.innerHTML = '<i class="ti ti-barcode me-1"></i>View assets'
    wrapper.appendChild(viewAssets)

    const printLabels = document.createElement("button")
    printLabels.type = "button"
    printLabels.classList.add("btn", "btn-sm", "btn-outline-secondary")
    printLabels.disabled = entry.asset_count === 0
    printLabels.innerHTML = '<i class="ti ti-printer me-1"></i>Print labels'
    printLabels.onclick = () => {
        console.log("Print labels for inventory entry", entry)
    }
    wrapper.appendChild(printLabels)

    if (canManageInventories) {
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

    const gridOptions:GridOptions<InventoryItemEntry> = {
        domLayout: "autoHeight",
        animateRows: true,
        enableCellTextSelection: true,
        suppressMovableColumns: true,
        getRowId: params => String(params.data.id),
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
            },
            {
                field: "quantity",
                headerName: "Quantity",
                minWidth: 110,
                flex: 1,
            },
            {
                headerName: "Container",
                valueGetter: params => params.data?.container?.name ?? "No container",
                cellRenderer: (params:any) => {
                    if (!params.data || !canManageInventories) {
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
        const preferredMode = selectedItem.asset_count > 0 ? "existing" : "create"
        const preferredInput = document.querySelector<HTMLInputElement>(
            `.inventory-asset-mode[value="${preferredMode}"]`
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

    const list = details.length
        ? `<ul class="mb-0 mt-2">${details.map(detail => `<li>${detail}</li>`).join("")}</ul>`
        : ""
    element.innerHTML = `<div>${message}</div>${list}`
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

    const data:CreateInventoryEntryRequest = {
        inventory_item_id: selectedItem.id,
        container_id: containerSelect.value
            ? Number(containerSelect.value)
            : null,
        quantity: Number(quantityInput.value),
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
        quantityInput.value = "1"
        ;(document.getElementById(
            "inventory-existing-asset-codes"
        ) as HTMLTextAreaElement).value = ""
        ;(document.getElementById(
            "inventory-existing-asset-start-index"
        ) as HTMLInputElement).value = "1"
        renderExistingAssetValidation("idle", "")
        updateAssetSelectionForm()
        renderEntryAttributeFields(selectedItem)
    } catch (error) {
        errorToast(getErrorMessage(error))
    } finally {
        submitButton.disabled = false
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

    if (canManageInventories) {
        await Promise.all([loadItems(), loadContainers()])

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
            ?.addEventListener("input", () => validateExistingAssetSelectionDebounced())
        document.getElementById("inventory-entry-attribute-fields")
            ?.addEventListener("change", () => validateExistingAssetSelectionDebounced())
    } else {
        await loadContainers()
    }

    const detail = await getInventoryDetail(inventoryId)
    renderInventoryDetail(detail.data)

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
