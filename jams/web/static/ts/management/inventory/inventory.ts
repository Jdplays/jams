import {
    activateInventory,
    archiveInventory,
    getAllInventory,
    getInventorySummary,
    getUser,
} from '@global/endpoints'
import {
    buildUserAvatar,
    errorToast,
    isDefined,
    successToast,
} from "@global/helper";

function archiveInventoryOnClick(inventoryId:number) {
    archiveInventory(inventoryId).then((response) => {
        successToast(response.message)
        buildInventoryList()
    }).catch((error) => {
        const errorMessage = error.responseJSON?.message
            ?? "An unknown error occurred"

        errorToast(errorMessage)
    })
}

function activateInventoryOnClick(inventoryId:number) {
    activateInventory(inventoryId).then((response) => {
        successToast(response.message)
        buildInventoryList()
    }).catch((error) => {
        const errorMessage = error.responseJSON?.message
            ?? "An unknown error occurred"

        errorToast(errorMessage)
    })
}

async function buildInventoryList() {

    const listContainer = document.getElementById("inventory-list-container")

    if (!listContainer) {
        throw new Error("Inventory list container was not found")
    }

    const canManageInventories =
        listContainer.dataset.canManageInventories === "true"

    const resp = await getAllInventory()
    listContainer.replaceChildren()

    const activeInventories = resp.data.filter(inventory => inventory.active)
    const currentInventory = activeInventories.reduce(
        (newest, inventory) => {
            if (!newest) {
                return inventory
            }

            if (inventory.date === newest.date) {
                return inventory.id > newest.id ? inventory : newest
            }

            return inventory.date > newest.date ? inventory : newest
        },
        undefined as typeof resp.data[number] | undefined
    )

    for (const inventory of resp.data) {
        const summary = await getInventorySummary(inventory.id)
        const coordinator = await getUser(inventory.coordinator_id)

        // Base card
        const cardDiv = document.createElement("div")
        cardDiv.classList.add("card")

        const cardBody = document.createElement("div")
        cardBody.classList.add("card-body")

        const cardLayout = document.createElement("div")
        cardLayout.classList.add("d-flex", "align-items-stretch")

        const mainCardArea = document.createElement("div")
        mainCardArea.classList.add(
            "d-flex",
            "align-items-start",
            "flex-fill",
            "pe-3"
        )
        mainCardArea.style.cursor = "pointer"
        mainCardArea.onclick = () => {
            window.location.href = `/private/management/inventory/${inventory.id}`
        }

        // Inventory icon
        const iconAvatar = document.createElement("span")
        iconAvatar.classList.add("avatar", "avatar-lg", "bg-blue-lt", "me-3")

        const inventoryIcon = document.createElement("i")
        inventoryIcon.classList.add("ti", "ti-packages", "fs-1")

        iconAvatar.appendChild(inventoryIcon)

        // Main card content
        const contentDiv = document.createElement("div")
        contentDiv.classList.add("flex-fill")

        const headerDiv = document.createElement("div")
        headerDiv.classList.add(
            "d-flex",
            "align-items-start",
            "justify-content-between",
            "gap-3"
        )

        const titleContainer = document.createElement("div")

        const title = document.createElement("h3")
        title.classList.add("card-title", "mb-1")

        const titleText = document.createElement("span")
        titleText.classList.add("text-reset")
        titleText.textContent = inventory.name

        title.appendChild(titleText)

        // Inventory date
        const dateDiv = document.createElement("div")
        dateDiv.classList.add("text-secondary")

        const dateIcon = document.createElement("i")
        dateIcon.classList.add("ti", "ti-calendar", "me-1")

        const dateText = document.createElement("span")
        dateText.textContent = inventory.date

        dateDiv.append(dateIcon, dateText)
        titleContainer.append(title, dateDiv)

        const statusBadge = document.createElement("span")
        statusBadge.classList.add("badge")

        if (!inventory.active) {
            statusBadge.classList.add("bg-red-lt")
            statusBadge.textContent = "Archived"
        } else if (inventory.id === currentInventory?.id) {
            statusBadge.classList.add("bg-green-lt")
            statusBadge.textContent = "Active"
        } else {
            statusBadge.classList.add("bg-secondary-lt")
            statusBadge.textContent = "Old"
        }

        headerDiv.append(titleContainer, statusBadge)

        // Bottom metadata row
        const metadataDiv = document.createElement("div")
        metadataDiv.classList.add(
            "d-flex",
            "flex-wrap",
            "align-items-center",
            "gap-3",
            "mt-3",
            "text-secondary"
        )

        // Entry count
        const entryCountDiv = createMetadataItem(
            "ti-list-details",
            summary.data.entry_count ?? 0,
            "entries"
        )

        // Total count
        const totalCountDiv = createMetadataItem(
            "ti-sum",
            summary.data.total_count ?? 0,
            "total items"
        )

        // Asset count
        const assetCountDiv = createMetadataItem(
            "ti-barcode",
            summary.data.asset_count ?? 0,
            "assets"
        )

        // Coordinator
        const coordinatorDiv = document.createElement("div")
        coordinatorDiv.classList.add("d-flex", "align-items-center")

        const coordinatorAvatar = buildUserAvatar(coordinator, 20)
        coordinatorAvatar.classList.add('me-2')

        const coordinatorText = document.createElement("span")
        coordinatorText.append("Coordinated by ")

        const coordinatorName = document.createElement("strong")
        coordinatorName.classList.add("text-body")
        coordinatorName.textContent = coordinator.display_name

        coordinatorText.appendChild(coordinatorName)
        coordinatorDiv.append(coordinatorAvatar, coordinatorText)

        metadataDiv.append(entryCountDiv, totalCountDiv, assetCountDiv, coordinatorDiv)
        contentDiv.append(headerDiv, metadataDiv)
        mainCardArea.append(iconAvatar, contentDiv)
        cardLayout.appendChild(mainCardArea)

        if (canManageInventories) {
            const managementActions = document.createElement("div")
            managementActions.classList.add(
                "d-flex",
                "flex-column",
                "justify-content-center",
                "gap-2",
                "border-start",
                "ps-3"
            )

            const editButton = document.createElement("button")
            editButton.id = `edit-inventory-${inventory.id}`
            editButton.type = "button"
            editButton.classList.add(
                "btn",
                "btn-outline-primary",
                "btn-sm"
            )
            editButton.onclick = () => {
                console.log("Edit inventory:", inventory.id)
            }

            const editIcon = document.createElement("i")
            editIcon.classList.add("ti", "ti-pencil", "me-1")
            editButton.append(editIcon, "Edit")

            const archiveActivateButton = document.createElement("button")
            archiveActivateButton.type = "button"
            archiveActivateButton.classList.add(
                "btn",
                inventory.active ? "btn-danger" : "btn-success",
                "btn-sm"
            )
            archiveActivateButton.onclick = () => {
                archiveActivateButton.disabled = true

                if (inventory.active) {
                    archiveInventoryOnClick(inventory.id)
                } else {
                    activateInventoryOnClick(inventory.id)
                }
            }

            const archiveActivateIcon = document.createElement("i")
            archiveActivateIcon.classList.add(
                "ti",
                inventory.active ? "ti-archive" : "ti-archive-off",
                "me-1"
            )
            archiveActivateButton.append(
                archiveActivateIcon,
                inventory.active ? "Archive" : "Activate"
            )

            managementActions.append(editButton, archiveActivateButton)
            cardLayout.appendChild(managementActions)
        }

        cardBody.appendChild(cardLayout)
        cardDiv.appendChild(cardBody)
        listContainer.appendChild(cardDiv)
    }

    function createMetadataItem(
        iconClass: string,
        count: number,
        label: string
    ): HTMLDivElement {
        const container = document.createElement("div")
        container.classList.add("d-flex", "align-items-center")

        const icon = document.createElement("i")
        icon.classList.add("ti", iconClass, "me-2", "fs-3")

        const text = document.createElement("span")

        const value = document.createElement("strong")
        value.classList.add("text-body")
        value.textContent = count.toString()

        text.append(value, ` ${label}`)
        container.append(icon, text)

        return container
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (isDefined(window)) {
        await buildInventoryList()
    }
});
