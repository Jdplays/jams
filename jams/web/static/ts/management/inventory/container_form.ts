import {
    createInventoryContainer,
    getInventoryContainer,
    getInventoryContainers,
    updateInventoryContainer,
} from "@global/endpoints"
import { CreateInventoryContainerRequest } from "@global/endpoints_interfaces"
import { errorToast, successToast } from "@global/helper"

let containerId:number|null = null
let returnTo = "/private/management/inventory/containers"

function errorMessage(error:any):string {
    return error.responseJSON?.description
        ?? error.responseJSON?.message
        ?? "An unknown error occurred"
}

async function loadParentOptions() {
    const response = await getInventoryContainers()
    const select = document.getElementById("inventory-container-parent") as HTMLSelectElement

    for (const container of response.data) {
        if (container.archived || container.id === containerId) {
            continue
        }
        const option = document.createElement("option")
        option.value = String(container.id)
        option.textContent = container.name
        select.appendChild(option)
    }
}

async function loadContainer() {
    if (containerId === null) {
        return
    }

    const container = await getInventoryContainer(containerId)
    ;(document.getElementById("inventory-container-name") as HTMLInputElement).value = container.name
    ;(document.getElementById("inventory-container-description") as HTMLTextAreaElement).value = container.description ?? ""
    ;(document.getElementById("inventory-container-parent") as HTMLSelectElement).value = container.parent_container_id
        ? String(container.parent_container_id)
        : ""
}

async function submit(event:SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    if (!form.reportValidity()) {
        return
    }

    const button = document.getElementById("save-inventory-container") as HTMLButtonElement
    button.disabled = true

    const parentValue = (document.getElementById("inventory-container-parent") as HTMLSelectElement).value
    const data:CreateInventoryContainerRequest = {
        name: (document.getElementById("inventory-container-name") as HTMLInputElement).value.trim(),
        description: (document.getElementById("inventory-container-description") as HTMLTextAreaElement).value.trim(),
        parent_container_id: parentValue ? Number(parentValue) : null,
    }

    try {
        if (containerId === null) {
            await createInventoryContainer(data)
            successToast("Inventory container created")
        } else {
            await updateInventoryContainer(containerId, data)
            successToast("Inventory container updated")
        }

        window.location.href = returnTo
    } catch (error) {
        errorToast(errorMessage(error))
        button.disabled = false
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.getElementById("inventory-container-form-page")
    containerId = page?.dataset.containerId ? Number(page.dataset.containerId) : null
    returnTo = page?.dataset.returnTo || returnTo

    document.getElementById("inventory-container-form")
        ?.addEventListener("submit", submit)

    try {
        await loadParentOptions()
        await loadContainer()
    } catch (error) {
        console.error(error)
        errorToast(errorMessage(error))
    }
})
