import { addNewEvent, editEvent, getEvent, getEventbriteEvents } from "@global/endpoints"
import { EventbriteEvent, Event } from "@global/endpoints_interfaces"
import { addSpinnerToElement, createDropdown, errorToast, isDefined, isNullEmptyOrSpaces, removeSpinnerFromElement } from "@global/helper"

let EventId:number
let EventData:Event

async function prepEditEventForm() {
    const eventNameInput = document.getElementById('edit-event-name') as HTMLInputElement
    const eventDescriptionInput = document.getElementById('edit-event-description') as HTMLInputElement
    const eventDateInput = document.getElementById('edit-event-date') as HTMLInputElement
    const eventStartInput = document.getElementById('edit-event-start') as HTMLInputElement
    const eventEndInput = document.getElementById('edit-event-end') as HTMLInputElement
    const eventCapacityInput = document.getElementById('edit-event-capacity') as HTMLInputElement
    const eventPasswordInput = document.getElementById('edit-event-password') as HTMLInputElement

    eventNameInput.value = EventData.name
    eventDescriptionInput.value = EventData.description
    eventDateInput.value = EventData.date
    eventStartInput.value = EventData.start_time
    eventEndInput.value = EventData.end_time
    eventCapacityInput.value = String(EventData.capacity)
    eventPasswordInput.value = EventData.password
}

async function toggleEventbriteImportOnChange() {
    const toggle = document.getElementById('toggle-eventbrite-import-switch') as HTMLInputElement
    const importContainer = document.getElementById('eventbrite-import-container') as HTMLElement
    const importDropdownContainer = document.getElementById('eventbrite-import-dropdown-container') as HTMLDivElement

    const eventNameInput = document.getElementById('edit-event-name') as HTMLInputElement
    const eventDescriptionInput = document.getElementById('edit-event-description') as HTMLInputElement
    const eventDateInput = document.getElementById('edit-event-date') as HTMLInputElement
    const eventStartInput = document.getElementById('edit-event-start') as HTMLInputElement
    const eventEndInput = document.getElementById('edit-event-end') as HTMLInputElement
    const eventCapacityInput = document.getElementById('edit-event-capacity') as HTMLInputElement

    const checked = toggle.checked

    setEventbriteImportContainerElementsVisibility(false)

    if (checked) {
        importContainer.style.display = 'block'

        removeSpinnerFromElement(importContainer)
        addSpinnerToElement(importContainer)

        const events = await getEventbriteEvents()
        await createEventsImportDropDown(events, importDropdownContainer)

        removeSpinnerFromElement(importContainer)
        setEventbriteImportContainerElementsVisibility(true)
        
        eventbriteEventsDropdownOnChange(events)
    } else {
        importContainer.style.display = 'none'
        prepEditEventForm()
    }

    eventNameInput.disabled = checked
    eventDescriptionInput.disabled = checked
    eventDateInput.disabled = checked
    eventStartInput.disabled = checked
    eventEndInput.disabled = checked
    eventCapacityInput.disabled = checked

}

function setEventbriteImportContainerElementsVisibility(value:boolean) {
    const importContainer = document.getElementById('eventbrite-import-container') as HTMLElement
    const importLabel = importContainer.querySelector('label') as HTMLLabelElement
    const importDropdownContainer = importContainer.querySelector('#eventbrite-import-dropdown-container') as HTMLDivElement
    const importWarningText = importContainer.querySelector('p') as HTMLParagraphElement

    if (value) {
        importLabel.style.display = 'block'
        importDropdownContainer.style.display = 'block'
        importWarningText.style.display = 'block'
    } else {
        importLabel.style.display = 'none'
        importDropdownContainer.style.display = 'none'
        importWarningText.style.display = 'none'
    }
}

async function createEventsImportDropDown(events:EventbriteEvent[], parent:HTMLElement) {
    let oldSelect = parent.querySelector('select')
    if (oldSelect) {
        parent.removeChild(oldSelect)
    }

    let select = createDropdown(events, events[0].name, () => {
        eventbriteEventsDropdownOnChange(events)
    })
    select.classList.add('form-control')
    select.id = 'eventbrite-import-dropdown'
    parent.appendChild(select)
}

function eventbriteEventsDropdownOnChange(events:EventbriteEvent[]) {
    const importDropdownContainer = document.getElementById('eventbrite-import-dropdown') as HTMLInputElement

    const eventNameInput = document.getElementById('edit-event-name') as HTMLInputElement
    const eventDescriptionInput = document.getElementById('edit-event-description') as HTMLInputElement
    const eventDateInput = document.getElementById('edit-event-date') as HTMLInputElement
    const eventStartInput = document.getElementById('edit-event-start') as HTMLInputElement
    const eventEndInput = document.getElementById('edit-event-end') as HTMLInputElement
    const eventCapacityInput = document.getElementById('edit-event-capacity') as HTMLInputElement
    const eventUrlHiddenInput = document.getElementById('edit-eventbrite-url') as HTMLInputElement
    const eventIdHiddenInput = document.getElementById('edit-eventbrite-id') as HTMLInputElement

    let event = events.filter(ev => ev.id === importDropdownContainer.value)[0]

    eventNameInput.value = event.name
    eventDescriptionInput.value = event.description
    eventDateInput.value = event.date
    eventStartInput.value = event.start_time
    eventEndInput.value = event.end_time
    eventCapacityInput.value = String(event.capacity)
    eventUrlHiddenInput.value = event.url
    eventIdHiddenInput.value = event.id

    onInputChangeValidate(eventNameInput)
    onInputChangeValidate(eventDescriptionInput)
    onInputChangeValidate(eventDateInput)
    onInputChangeValidate(eventStartInput)
    onInputChangeValidate(eventEndInput)
    onInputChangeValidate(eventCapacityInput)

}

async function editEventOnclick() {
    const eventNameInput = document.getElementById('edit-event-name') as HTMLInputElement
    const eventDescriptionInput = document.getElementById('edit-event-description') as HTMLInputElement
    const eventDateInput = document.getElementById('edit-event-date') as HTMLInputElement
    const eventStartInput = document.getElementById('edit-event-start') as HTMLInputElement
    const eventEndInput = document.getElementById('edit-event-end') as HTMLInputElement
    const eventCapacityInput = document.getElementById('edit-event-capacity') as HTMLInputElement
    const eventPasswordInput = document.getElementById('edit-event-password') as HTMLInputElement
    const eventUrlHiddenInput = document.getElementById('edit-eventbrite-url') as HTMLInputElement
    const eventbriteIdHiddenInput = document.getElementById('edit-eventbrite-id') as HTMLInputElement

    let external = false
    if (!isNullEmptyOrSpaces(eventbriteIdHiddenInput.value)) {
        external = true
    }

    let data:Partial<Event> = {}
    if (external) {
        data = {
            name: eventNameInput.value,
            description: eventDescriptionInput.value,
            date: eventDateInput.value,
            start_time: eventStartInput.value,
            end_time: eventEndInput.value,
            capacity: Number(eventCapacityInput.value),
            password: eventPasswordInput.value,
            external: external,
            external_id: eventbriteIdHiddenInput.value,
            external_url: eventUrlHiddenInput.value
        }
    } else {
        data = {
            name: eventNameInput.value,
            description: eventDescriptionInput.value,
            date: eventDateInput.value,
            start_time: eventStartInput.value,
            end_time: eventEndInput.value,
            capacity: Number(eventCapacityInput.value),
            password: eventPasswordInput.value,
        }
    }

    const respose = await editEvent(EventId, data)
    if (respose) {
        window.location.replace('/private/admin/events')
    } else {
        errorToast()
    }
}

function onInputChangeValidate(element:HTMLInputElement) {
    if (isNullEmptyOrSpaces(element.value)) {
        element.classList.remove('is-valid')
        element.classList.add('is-invalid')
    } else {
        element.classList.remove('is-invalid')
        element.classList.add('is-valid')
    }
}

// EVent Listeners
document.addEventListener("DOMContentLoaded", async () => {
    const pagePath = window.location.pathname
    const pathParts = pagePath.split('/')
    EventId = Number(pathParts[pathParts.length - 2])
    EventData = await getEvent(EventId)
    prepEditEventForm()
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).toggleEventbriteImportOnChange = toggleEventbriteImportOnChange;
        (<any>window).editEventOnclick = editEventOnclick;
        (<any>window).onInputChangeValidate = onInputChangeValidate;
    }
});