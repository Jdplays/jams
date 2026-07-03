import {
    createInventoryItem,
    getInventoryItem,
    updateInventoryItem,
    validateInventoryItemAssetCodePrefix,
} from "@global/endpoints"
import {
    CreateInventoryItemRequest,
    InventoryAttributeDefinition,
    InventoryAttributeOption,
} from "@global/endpoints_interfaces"
import { debounce, errorToast, successToast } from "@global/helper"

let itemId:number|null = null
let returnTo = "/private/management/inventory/items"
let assetPrefixValidationSequence = 0

function errorMessage(error:any):string {
    return error.responseJSON?.description
        ?? error.responseJSON?.message
        ?? "An unknown error occurred"
}

function normaliseKey(value:string):string {
    return value.trim().toLowerCase().replace(/\s+/g, "_")
}

function setAssetPrefixValidation(message:string, state:"idle"|"valid"|"invalid") {
    const validation = document.getElementById(
        "inventory-item-asset-prefix-validation"
    )
    if (!validation) {
        return
    }

    validation.textContent = message
    validation.classList.toggle("text-success", state === "valid")
    validation.classList.toggle("text-danger", state === "invalid")
}

function updateAssetPrefixExample() {
    const prefixInput = document.getElementById(
        "inventory-item-asset-prefix"
    ) as HTMLInputElement
    const prefix = prefixInput.value || "PI5"
    const example = document.getElementById(
        "inventory-item-asset-prefix-example"
    )
    if (example) {
        example.textContent = `${prefix}-001, ${prefix}-002`
    }
}

async function validateAssetCodePrefix():Promise<boolean> {
    const prefixInput = document.getElementById(
        "inventory-item-asset-prefix"
    ) as HTMLInputElement
    const isAsset = (document.getElementById(
        "inventory-item-is-asset"
    ) as HTMLInputElement).checked
    const sequence = ++assetPrefixValidationSequence

    prefixInput.setCustomValidity("")
    if (!isAsset) {
        setAssetPrefixValidation("", "idle")
        return true
    }

    const prefix = prefixInput.value
    if (!/^[A-Z0-9]{3}$/.test(prefix)) {
        const message = "Use exactly 3 uppercase letters or numbers"
        prefixInput.setCustomValidity(message)
        setAssetPrefixValidation(prefix ? message : "", "invalid")
        return false
    }

    setAssetPrefixValidation("Checking availability...", "idle")

    try {
        const result = await validateInventoryItemAssetCodePrefix(prefix, itemId)
        if (sequence !== assetPrefixValidationSequence) {
            return false
        }

        if (!result.valid || !result.available) {
            prefixInput.setCustomValidity(result.message)
            setAssetPrefixValidation(result.message, "invalid")
            return false
        }

        setAssetPrefixValidation(result.message, "valid")
        return true
    } catch (error) {
        if (sequence === assetPrefixValidationSequence) {
            setAssetPrefixValidation(
                "Availability could not be checked; it will be checked when saved.",
                "idle"
            )
        }
        return true
    }
}

const validateAssetCodePrefixDebounced = debounce(
    () => validateAssetCodePrefix(),
    350
)

function handleAssetPrefixInput() {
    const prefixInput = document.getElementById(
        "inventory-item-asset-prefix"
    ) as HTMLInputElement
    prefixInput.value = prefixInput.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 3)
    prefixInput.setCustomValidity("")
    updateAssetPrefixExample()
    validateAssetCodePrefixDebounced()
}

function updateEmptyState() {
    const container = document.getElementById("inventory-item-attributes")
    document.getElementById("no-inventory-item-attributes")
        ?.classList.toggle("d-none", Boolean(container?.children.length))
}

function updateAssetTrackingForm() {
    const isAsset = (document.getElementById(
        "inventory-item-is-asset"
    ) as HTMLInputElement).checked
    const prefixContainer = document.getElementById(
        "inventory-item-asset-prefix-container"
    )!
    const prefixInput = document.getElementById(
        "inventory-item-asset-prefix"
    ) as HTMLInputElement
    const typeSelect = document.getElementById(
        "inventory-item-type"
    ) as HTMLSelectElement
    const needsLabel = document.getElementById(
        "inventory-item-needs-label"
    ) as HTMLInputElement
    const virtualOption = typeSelect.querySelector<HTMLOptionElement>(
        'option[value="VIRTUAL"]'
    )

    prefixContainer.classList.toggle("d-none", !isAsset)
    prefixInput.required = isAsset
    virtualOption?.toggleAttribute("disabled", isAsset)
    needsLabel.disabled = !isAsset

    if (isAsset) {
        typeSelect.value = "PHYSICAL"
    } else {
        needsLabel.checked = false
        prefixInput.setCustomValidity("")
        setAssetPrefixValidation("", "idle")
    }

    updateAssetPrefixExample()
}

function addValueRow(container:HTMLElement, option?:InventoryAttributeOption) {
    const row = document.createElement("div")
    row.classList.add("input-group", "mb-2", "attribute-value-row")
    if (option?.key) {
        row.dataset.key = option.key
    }

    const input = document.createElement("input")
    input.classList.add("form-control", "attribute-value-label")
    input.placeholder = "Value, e.g. Large"
    input.value = option?.label ?? ""
    input.required = true

    const remove = document.createElement("button")
    remove.type = "button"
    remove.classList.add("btn", "btn-outline-danger")
    remove.setAttribute("aria-label", "Remove value")
    remove.innerHTML = '<i class="ti ti-x"></i>'
    remove.onclick = () => row.remove()

    row.append(input, remove)
    container.appendChild(row)
}

function addAttributeCard(attribute?:InventoryAttributeDefinition) {
    const container = document.getElementById("inventory-item-attributes")
    if (!container) {
        return
    }

    const card = document.createElement("div")
    card.classList.add("card", "card-sm", "mb-3", "inventory-attribute-card")
    if (attribute?.key) {
        card.dataset.key = attribute.key
    }

    const body = document.createElement("div")
    body.classList.add("card-body")
    body.innerHTML = `
        <div class="row g-3">
            <div class="col-12 col-md-5">
                <label class="form-label required">Attribute name</label>
                <input class="form-control attribute-label" maxlength="100" required>
            </div>
            <div class="col-12 col-md-3">
                <label class="form-label required">Input type</label>
                <select class="form-select attribute-type">
                    <option value="select">Select</option>
                    <option value="boolean">Yes / No</option>
                </select>
            </div>
            <div class="col-8 col-md-2 d-flex align-items-end">
                <label class="form-check form-switch mb-2">
                    <input class="form-check-input attribute-required" type="checkbox">
                    <span class="form-check-label">Required</span>
                </label>
            </div>
            <div class="col-4 col-md-2 d-flex align-items-end justify-content-end">
                <button class="btn btn-outline-danger remove-attribute" type="button">
                    <i class="ti ti-trash me-1"></i>Remove
                </button>
            </div>
        </div>
        <div class="attribute-values-section mt-3">
            <label class="form-label required">Available values</label>
            <div class="attribute-values"></div>
            <button class="btn btn-sm btn-outline-primary add-attribute-value" type="button">
                <i class="ti ti-plus me-1"></i>Add value
            </button>
        </div>
    `

    const label = body.querySelector(".attribute-label") as HTMLInputElement
    const type = body.querySelector(".attribute-type") as HTMLSelectElement
    const required = body.querySelector(".attribute-required") as HTMLInputElement
    const valuesSection = body.querySelector(".attribute-values-section") as HTMLElement
    const values = body.querySelector(".attribute-values") as HTMLElement

    label.value = attribute?.label ?? ""
    type.value = attribute?.type ?? "select"
    required.checked = attribute?.required ?? false

    const updateType = () => {
        valuesSection.classList.toggle("d-none", type.value === "boolean")
        values.querySelectorAll<HTMLInputElement>("input").forEach(input => {
            input.required = type.value === "select"
        })
    }
    type.addEventListener("change", updateType)

    body.querySelector<HTMLButtonElement>(".remove-attribute")!.onclick = () => {
        card.remove()
        updateEmptyState()
    }
    body.querySelector<HTMLButtonElement>(".add-attribute-value")!.onclick = () => {
        addValueRow(values)
    }

    if (attribute?.type === "select") {
        const activeValues = attribute.values?.filter(value => value.active !== false) ?? []
        activeValues.forEach(value => addValueRow(values, value))
    }
    if (!values.children.length) {
        addValueRow(values)
    }

    updateType()
    card.appendChild(body)
    container.appendChild(card)
    updateEmptyState()
    label.focus()
}

function collectAttributes():InventoryAttributeDefinition[] {
    const cards = Array.from(
        document.querySelectorAll<HTMLElement>(".inventory-attribute-card")
    )

    const attributes = cards.map(card => {
        const label = card.querySelector<HTMLInputElement>(".attribute-label")!.value.trim()
        const type = card.querySelector<HTMLSelectElement>(".attribute-type")!.value as "select"|"boolean"
        const required = card.querySelector<HTMLInputElement>(".attribute-required")!.checked
        const key = card.dataset.key || normaliseKey(label)

        const attribute:InventoryAttributeDefinition = {
            key,
            label,
            type,
            required,
            active: true,
        }

        if (type === "select") {
            attribute.values = Array.from(
                card.querySelectorAll<HTMLElement>(".attribute-value-row")
            ).map(row => {
                const valueLabel = row.querySelector<HTMLInputElement>(".attribute-value-label")!.value.trim()
                return {
                    key: row.dataset.key || normaliseKey(valueLabel),
                    label: valueLabel,
                    active: true,
                }
            })

            if (!attribute.values.length) {
                throw new Error(`${label} needs at least one available value`)
            }
        }

        return attribute
    })

    const keys = attributes.map(attribute => attribute.key)
    if (new Set(keys).size !== keys.length) {
        throw new Error("Attribute names must be unique")
    }

    for (const attribute of attributes) {
        const valueKeys = attribute.values?.map(value => value.key) ?? []
        if (new Set(valueKeys).size !== valueKeys.length) {
            throw new Error(`Values for ${attribute.label} must be unique`)
        }
    }

    return attributes
}

async function loadItem() {
    if (itemId === null) {
        return
    }

    const item = await getInventoryItem(itemId)
    ;(document.getElementById("inventory-item-name") as HTMLInputElement).value = item.name
    ;(document.getElementById("inventory-item-description") as HTMLTextAreaElement).value = item.description ?? ""
    ;(document.getElementById("inventory-item-type") as HTMLSelectElement).value = item.type
    ;(document.getElementById("inventory-item-is-asset") as HTMLInputElement).checked = item.is_asset
    ;(document.getElementById("inventory-item-asset-prefix") as HTMLInputElement).value = item.asset_code_prefix ?? ""
    ;(document.getElementById("inventory-item-needs-label") as HTMLInputElement).checked = item.needs_label
    updateAssetTrackingForm()
    await validateAssetCodePrefix()

    item.attribute_schema?.attributes
        ?.filter(attribute => attribute.active !== false)
        .forEach(attribute => addAttributeCard(attribute))
    updateEmptyState()
}

async function submit(event:SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    if (!form.reportValidity()) {
        return
    }

    const button = document.getElementById("save-inventory-item") as HTMLButtonElement
    button.disabled = true

    try {
        const attributes = collectAttributes()
        const isAsset = (document.getElementById(
            "inventory-item-is-asset"
        ) as HTMLInputElement).checked
        const data:CreateInventoryItemRequest = {
            name: (document.getElementById("inventory-item-name") as HTMLInputElement).value.trim(),
            description: (document.getElementById("inventory-item-description") as HTMLTextAreaElement).value.trim() || null,
            type: (document.getElementById("inventory-item-type") as HTMLSelectElement).value as "PHYSICAL"|"VIRTUAL",
            is_asset: isAsset,
            needs_label: isAsset && (document.getElementById(
                "inventory-item-needs-label"
            ) as HTMLInputElement).checked,
            asset_code_prefix: isAsset
                ? (document.getElementById("inventory-item-asset-prefix") as HTMLInputElement).value.trim().toUpperCase()
                : null,
            attribute_schema: attributes.length ? { attributes } : null,
        }

        if (itemId === null) {
            await createInventoryItem(data)
            successToast("Inventory item created")
        } else {
            await updateInventoryItem(itemId, data)
            successToast("Inventory item updated")
        }

        window.location.href = returnTo
    } catch (error) {
        errorToast(error instanceof Error ? error.message : errorMessage(error))
        button.disabled = false
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.getElementById("inventory-item-form-page")
    itemId = page?.dataset.itemId ? Number(page.dataset.itemId) : null
    returnTo = page?.dataset.returnTo || returnTo

    document.getElementById("add-inventory-attribute")
        ?.addEventListener("click", () => addAttributeCard())
    document.getElementById("inventory-item-is-asset")
        ?.addEventListener("change", updateAssetTrackingForm)
    document.getElementById("inventory-item-asset-prefix")
        ?.addEventListener("input", handleAssetPrefixInput)
    document.getElementById("inventory-item-form")
        ?.addEventListener("submit", submit)

    try {
        await loadItem()
        updateEmptyState()
    } catch (error) {
        console.error(error)
        errorToast(errorMessage(error))
    }
})
