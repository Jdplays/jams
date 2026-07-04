import {
    createInventory,
    getInventory,
    getUsersPublicInfo,
    updateInventory,
} from "@global/endpoints"
import { CreateInventoryRequest, User } from "@global/endpoints_interfaces"
import { errorToast, successToast } from "@global/helper"

let inventoryId:number|null = null
let returnTo = "/private/management/inventory"

function errorMessage(error:any):string {
    return error.responseJSON?.description
        ?? error.responseJSON?.message
        ?? "An unknown error occurred"
}

function localDateValue():string {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60_000
    return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

async function loadCoordinators() {
    const response = await getUsersPublicInfo(
        "$all_rows=true&$order_by=username"
    )
    const select = document.getElementById(
        "inventory-coordinator"
    ) as HTMLSelectElement

    for (const user of response.data as Partial<User>[]) {
        if (user.id === undefined) {
            continue
        }
        const option = document.createElement("option")
        option.value = String(user.id)
        option.textContent = user.display_name ?? user.username ?? `User #${user.id}`
        select.appendChild(option)
    }
}

async function loadInventory() {
    const date = document.getElementById("inventory-date") as HTMLInputElement
    if (inventoryId === null) {
        date.value = localDateValue()
        return
    }

    const inventory = await getInventory(inventoryId)
    ;(document.getElementById("inventory-name") as HTMLInputElement).value = inventory.name
    date.value = inventory.date
    ;(document.getElementById(
        "inventory-coordinator"
    ) as HTMLSelectElement).value = inventory.coordinator_id === undefined
        ? ""
        : String(inventory.coordinator_id)
}

async function submit(event:SubmitEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    if (!form.reportValidity()) {
        return
    }

    const button = document.getElementById("save-inventory") as HTMLButtonElement
    const coordinatorId = Number((document.getElementById(
        "inventory-coordinator"
    ) as HTMLSelectElement).value)
    const data:CreateInventoryRequest = {
        name: (document.getElementById("inventory-name") as HTMLInputElement).value.trim(),
        date: (document.getElementById("inventory-date") as HTMLInputElement).value,
        coordinator_id: coordinatorId,
    }

    button.disabled = true
    try {
        if (inventoryId === null) {
            await createInventory(data)
            successToast("Inventory created")
        } else {
            await updateInventory(inventoryId, data)
            successToast("Inventory updated")
        }
        window.location.href = returnTo
    } catch (error) {
        errorToast(errorMessage(error))
        button.disabled = false
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const page = document.getElementById("inventory-form-page")
    inventoryId = page?.dataset.inventoryId
        ? Number(page.dataset.inventoryId)
        : null
    returnTo = page?.dataset.returnTo || returnTo

    document.getElementById("inventory-form")
        ?.addEventListener("submit", submit)

    try {
        await loadCoordinators()
        await loadInventory()
    } catch (error) {
        console.error(error)
        errorToast(errorMessage(error))
    }
})
