import { addNewEvent, getEventbriteEvents, getEvents, getEventsField } from "@global/endpoints"
import { EventbriteEvent, Event } from "@global/endpoints_interfaces"
import { addSpinnerToElement, animateElement, buildQueryString, combineDateTime, createDropdown, createRegexFromList, errorToast, formatDateToShort, isDefined, isNullEmptyOrSpaces, removeSpinnerFromElement, validateNumberInput, validateTextInput } from "@global/helper"
import { InputValidationPattern, QueryStringData } from "@global/interfaces"

let currentEventNames:string[];

let nameInputValid:boolean = false
let descriptionInputValid:boolean = false
let dateInputValid:boolean = false
let startInputValid:boolean = false
let endInputValid:boolean = false
let capacityInputValid:boolean = false
let passwordInputValid:boolean = false

async function toggleEventbriteImportOnChange() {
    const toggle = document.getElementById('toggle-eventbrite-import-switch') as HTMLInputElement
    const importContainer = document.getElementById('eventbrite-import-container') as HTMLElement
    const importDropdownContainer = document.getElementById('eventbrite-import-dropdown-container') as HTMLDivElement

    const eventNameInput = document.getElementById('add-event-name') as HTMLInputElement
    const eventDescriptionInput = document.getElementById('add-event-description') as HTMLInputElement
    const eventDateInput = document.getElementById('add-event-date') as HTMLInputElement
    const eventStartInput = document.getElementById('add-event-start') as HTMLInputElement
    const eventEndInput = document.getElementById('add-event-end') as HTMLInputElement
    const eventCapacityInput = document.getElementById('add-event-capacity') as HTMLInputElement

    const checked = toggle.checked

    setEventbriteImportContainerElementsVisibility(false)

    if (checked) {
        importContainer.style.display = 'block'
    } else {
        importContainer.style.display = 'none'
    }

    removeSpinnerFromElement(importContainer)
    addSpinnerToElement(importContainer)

    const events = await getEventbriteEvents()
    await createEventsImportDropDown(events, importDropdownContainer)

    removeSpinnerFromElement(importContainer)
    setEventbriteImportContainerElementsVisibility(true)

    eventNameInput.disabled = checked
    eventDescriptionInput.disabled = checked
    eventDateInput.disabled = checked
    eventStartInput.disabled = checked
    eventEndInput.disabled = checked
    eventCapacityInput.disabled = checked

    eventbriteEventsDropdownOnChange(events)

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

    const eventNameInput = document.getElementById('add-event-name') as HTMLInputElement
    const eventDescriptionInput = document.getElementById('add-event-description') as HTMLInputElement
    const eventDateInput = document.getElementById('add-event-date') as HTMLInputElement
    const eventStartInput = document.getElementById('add-event-start') as HTMLInputElement
    const eventEndInput = document.getElementById('add-event-end') as HTMLInputElement
    const eventCapacityInput = document.getElementById('add-event-capacity') as HTMLInputElement
    const eventUrlHiddenInput = document.getElementById('add-eventbrite-url') as HTMLInputElement
    const eventIdHiddenInput = document.getElementById('add-eventbrite-id') as HTMLInputElement

    let event = events.filter(ev => ev.id === importDropdownContainer.value)[0]

    eventNameInput.value = event.name
    eventDescriptionInput.value = event.description
    eventDateInput.value = event.date
    console.log(event.start_date_time)
    eventStartInput.value = formatDateToShort(event.start_date_time, {includeDate:false, includeSeconds:false})
    eventEndInput.value = formatDateToShort(event.end_date_time, {includeDate:false, includeSeconds:false})
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

async function addEventOnclick() {
    const addButton = document.getElementById('add-event-button') as HTMLButtonElement

    const eventNameInput = document.getElementById('add-event-name') as HTMLInputElement
    const eventDescriptionInput = document.getElementById('add-event-description') as HTMLInputElement
    const eventDateInput = document.getElementById('add-event-date') as HTMLInputElement
    const eventStartInput = document.getElementById('add-event-start') as HTMLInputElement
    const eventEndInput = document.getElementById('add-event-end') as HTMLInputElement
    const eventCapacityInput = document.getElementById('add-event-capacity') as HTMLInputElement
    const eventPasswordInput = document.getElementById('add-event-password') as HTMLInputElement
    const eventUrlHiddenInput = document.getElementById('add-eventbrite-url') as HTMLInputElement
    const eventbriteIdHiddenInput = document.getElementById('add-eventbrite-id') as HTMLInputElement

    eventNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    eventDescriptionInput.dispatchEvent(new Event('input', { bubbles: true }))
    eventDateInput.dispatchEvent(new Event('input', { bubbles: true }))
    eventStartInput.dispatchEvent(new Event('input', { bubbles: true }))
    eventEndInput.dispatchEvent(new Event('input', { bubbles: true }))
    eventCapacityInput.dispatchEvent(new Event('input', { bubbles: true }))
    eventPasswordInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (!nameInputValid || !descriptionInputValid || !dateInputValid || !startInputValid || !endInputValid || !capacityInputValid || !passwordInputValid) {
        animateElement(addButton, 'element-shake')
        return
    }

    let external = false
    if (!isNullEmptyOrSpaces(eventbriteIdHiddenInput.value)) {
        external = true
    }

    const startDateTime = combineDateTime(eventDateInput.value, eventStartInput.value)
    const endDateTime = combineDateTime(eventDateInput.value, eventEndInput.value)

    let data:Partial<Event> = {}
    if (external) {
        data = {
            name: eventNameInput.value,
            description: eventDescriptionInput.value,
            date: eventDateInput.value,
            start_date_time: startDateTime,
            end_date_time: endDateTime,
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
            start_date_time: startDateTime,
            end_date_time: endDateTime,
            capacity: Number(eventCapacityInput.value),
            password: eventPasswordInput.value,
        }
    }

    const respose = await addNewEvent(data)
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
    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }
    const queryString = buildQueryString(queryData)
    
    getEventsField('name', queryString).then((response) => {
        const currentEvents = response.data
        if (currentEvents !== undefined) {
            currentEventNames = currentEvents.map(e => e.name)
        }
    })
})

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // Name
    const eventNameInput = document.getElementById('add-event-name') as HTMLInputElement
    eventNameInput.oninput = async () => {
        let patterns:InputValidationPattern[] = null
        if (currentEventNames) {
            patterns = [
            {pattern: createRegexFromList(currentEventNames), errorMessage: 'Already exists'}
            ]
        }

        nameInputValid = validateTextInput(eventNameInput, patterns)
    }

    // Description
    const eventDescriptionInput = document.getElementById('add-event-description') as HTMLInputElement
    eventDescriptionInput.oninput = async () => {
        descriptionInputValid = validateTextInput(eventDescriptionInput, null, true)
    }

    // Date
    const eventDateInput = document.getElementById('add-event-date') as HTMLInputElement
    eventDateInput.oninput = () => {
        dateInputValid = validateTextInput(eventDateInput)
    }

    // Date
    const eventstartInput = document.getElementById('add-event-start') as HTMLInputElement
    eventstartInput.oninput = () => {
        startInputValid = validateTextInput(eventstartInput, null, true)
    }

    // Date
    const eventEndInput = document.getElementById('add-event-end') as HTMLInputElement
    eventEndInput.oninput = () => {
        endInputValid = validateTextInput(eventEndInput, null, true)
    }

    // Capacity
    const eventCapacityInput = document.getElementById('add-event-capacity') as HTMLInputElement
    eventCapacityInput.oninput = () => {
        capacityInputValid = validateNumberInput(eventCapacityInput)
    }

    // Date
    const eventPasswordInput = document.getElementById('add-event-password') as HTMLInputElement
    eventPasswordInput.oninput = () => {
        passwordInputValid = validateTextInput(eventPasswordInput, null, true)
    }
})

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).toggleEventbriteImportOnChange = toggleEventbriteImportOnChange;
        (<any>window).addEventOnclick = addEventOnclick;
    }
});