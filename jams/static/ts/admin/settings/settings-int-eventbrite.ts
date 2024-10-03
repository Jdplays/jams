import { verifyEventbriteApiToken, getIconData, getEventbriteUserOrganisations, enableEventbriteIntegration, getEventbriteIntegrationConfig, editEventbriteIntegrationConfig, disableEventbriteIntegration, getEventbriteEvents, getEventbriteTicketTypes } from "@global/endpoints"
import { buildRadioInputSelectionGroup, createDropdown, emptyElement, errorToast, getCheckboxInputGroupSelection, getRadioInputGroupSelection, getSelectedDropdownText, isDefined, isNullEmptyOrSpaces, successToast } from "@global/helper"
import { EventbriteEvent, EventbriteIntegrationConfig, EventbriteOrganisation } from "@global/endpoints_interfaces"

let loadingIcon:string;
let tickIcon:string;
let xIcon:string;
let tokenUpdated:boolean = false
let tokenPlaceholder:string = '*****************'

let currentConfig:Partial<EventbriteIntegrationConfig>|null=null

async function setupPage() {
    const formElement = document.getElementById('eventbrite-config-form') as HTMLElement
    const loadingBarElement = document.getElementById('eventbrite-config-loading-bar') as HTMLElement

    if (currentConfig === null || currentConfig.EVENTBRITE_ENABLED === null) {
        const eventbriteConfig = await getEventbriteIntegrationConfig()
        currentConfig = eventbriteConfig
    }

    currentConfig.EVENTBRITE_BEARER_TOKEN = tokenPlaceholder

    const tokenBlock = document.getElementById('eventbrite-token-block') as HTMLElement
    const orgSelectBlock = document.getElementById('eventbrite-org-selection-block') as HTMLElement
    const advancedConfigBlock = document.getElementById('eventbrite-advanced-config-block') as HTMLElement

    const toggle = document.getElementById('toggle-eventbrite-switch') as HTMLInputElement
    const tokenInput = document.getElementById('eventbrite-api-token-input') as HTMLInputElement
    const verifyButton = document.getElementById('eventbrite-api-token-verify-button') as HTMLButtonElement
    const enableButton = document.getElementById('eventbrite-enable-button') as HTMLButtonElement
    const eventSelectContainer = document.getElementById('eventbrite-event-select-container') as HTMLElement
    const attendeeImportConfigBlock = document.getElementById('attendee-import-options-block') as HTMLDivElement

    enableButton.disabled = true
    tokenInput.value = ''

    if (currentConfig.EVENTBRITE_ENABLED) {
        let organisations = await getEventbriteUserOrganisations()

        toggle.checked = currentConfig.EVENTBRITE_ENABLED
        toggleOnUpdate()
        tokenBlock.style.display = 'block'
        orgSelectBlock.style.display = 'block'
        advancedConfigBlock.style.display = 'block'
        
        if (!tickIcon) {
            tickIcon = await getIconData('check')
        }
        verifyButton.innerHTML = tickIcon
        verifyButton.disabled = true

        tokenInput.value = currentConfig.EVENTBRITE_BEARER_TOKEN
        if (!isNullEmptyOrSpaces(currentConfig.EVENTBRITE_ORGANISATION_ID)) {
            populateOrgSelect(organisations, currentConfig.EVENTBRITE_ORGANISATION_ID)

            // Populate the event select
            const events = await getEventbriteEvents()
            populateEventSelect(events, eventSelectContainer)

            if (!isNullEmptyOrSpaces(currentConfig.EVENTBRITE_CONFIG_EVENT_ID)) {
                attendeeImportConfigBlock.style.display = 'block'
                populateTicketTypeSelectGroup()
            }
        } else {
            populateOrgSelect(organisations)
        }
    }

    formElement.style.display = 'block'
    loadingBarElement.style.display = 'none'
}

function toggleOnUpdate() {
    const toggle = document.getElementById('toggle-eventbrite-switch') as HTMLInputElement
    const saveButton = document.getElementById('eventbrite-save-button') as HTMLButtonElement
    const enableButton = document.getElementById('eventbrite-enable-button') as HTMLButtonElement
    const disableButton = document.getElementById('eventbrite-disable-button') as HTMLButtonElement

    if (currentConfig.EVENTBRITE_ENABLED) {
        if (toggle.checked) {
            saveButton.style.display = 'block'
        } else {
            saveButton.style.display = 'none'
        }

        if (!toggle.checked) {
            disableButton.style.display = 'block'
        } else {
            disableButton.style.display = 'none'
        }

        enableButton.style.display = 'none'
    } else {
        if (toggle.checked) {
            enableButton.style.display = 'block'
        } else {
            enableButton.style.display = 'none'
        }

        disableButton.style.display = 'none'
    }
    
}

async function eventbriteIntegrationSaveOnClick() {
    const tokenInput = document.getElementById('eventbrite-api-token-input') as HTMLInputElement
    const orgSelect = document.getElementById('eventbrite-org-select') as HTMLSelectElement
    const eventSelect = document.getElementById('eventbrite-event-select') as HTMLSelectElement

    const ticketTypeSelectionGroup = document.getElementById('ticket-type-selection-container')

    const saveButton = document.getElementById('eventbrite-save-button') as HTMLButtonElement

    const selectedTicketTypes = getCheckboxInputGroupSelection(ticketTypeSelectionGroup, 'ticket-type')
    const selectedTicketTypesString = selectedTicketTypes.join(',')

    const data:Partial<EventbriteIntegrationConfig> = {
        EVENTBRITE_ORGANISATION_ID: orgSelect.value,
        EVENTBRITE_ORGANISATION_NAME: getSelectedDropdownText(orgSelect),
        EVENTBRITE_CONFIG_EVENT_ID: eventSelect.value,
        EVENTBRITE_REGISTERABLE_TICKET_TYPES: selectedTicketTypesString
    }

    if (tokenInput.value !== tokenPlaceholder) {
        data.EVENTBRITE_BEARER_TOKEN = tokenInput.value
    }

    saveButton.innerHTML = '...'

    const response = await editEventbriteIntegrationConfig(data)
    if (response) {
        currentConfig = response
        successToast('Eventbrite Integration Updated')
        tokenUpdated = false
        checkIfConentUpdated()
        setupPage()
    } else {
        errorToast()
    }
    saveButton.innerHTML = 'Save'
}

async function eventbriteIntegrationEnableOnClick() {
    const tokenInput = document.getElementById('eventbrite-api-token-input') as HTMLInputElement
    const orgSelect = document.getElementById('eventbrite-org-select') as HTMLSelectElement
    const enableButton = document.getElementById('eventbrite-enable-button') as HTMLButtonElement

    const data:Partial<EventbriteIntegrationConfig> = {
        EVENTBRITE_ENABLED: true,
        EVENTBRITE_BEARER_TOKEN: tokenInput.value,
        EVENTBRITE_ORGANISATION_ID: orgSelect.value,
        EVENTBRITE_ORGANISATION_NAME: getSelectedDropdownText(orgSelect)
    }

    enableButton.innerHTML = '...'

    const response = await enableEventbriteIntegration(data)
    if (response) {
        currentConfig = data
        setupPage()
        successToast('Eventbrite Integration Enabled')
    } else {
        errorToast()
    }
    enableButton.innerHTML = 'Enable'
}

async function eventbriteIntegrationDisableOnClick() {
    const disableButton = document.getElementById('eventbrite-disable-button') as HTMLButtonElement

    disableButton.innerHTML = '...'

    const response = await disableEventbriteIntegration()
    if (response) {
        currentConfig = {}
        setupPage()
        toggleOnUpdate()
        successToast('Eventbrite Integration Disabled')
    } else {
        errorToast()
    }
    disableButton.innerHTML = 'Disable'
}

function checkIfConentUpdated() {
    const saveButton = document.getElementById('eventbrite-save-button') as HTMLButtonElement
    const enableButton = document.getElementById('eventbrite-enable-button') as HTMLButtonElement
    const orgSelect = document.getElementById('eventbrite-org-select') as HTMLSelectElement
    const eventSelect = document.getElementById('eventbrite-event-select') as HTMLSelectElement
    const ticketTypeSelectionGroup = document.getElementById('ticket-type-selection-container') as HTMLDivElement

    const selectedTicketTypes = getCheckboxInputGroupSelection(ticketTypeSelectionGroup, 'ticket-type')
    const selectedTicketTypesString = selectedTicketTypes.join(',')

    if (currentConfig.EVENTBRITE_ENABLED) {
        if (orgSelect.value !== currentConfig.EVENTBRITE_ORGANISATION_ID || eventSelect.value !== currentConfig.EVENTBRITE_CONFIG_EVENT_ID || selectedTicketTypesString !== currentConfig.EVENTBRITE_REGISTERABLE_TICKET_TYPES || tokenUpdated) {
            saveButton.disabled = false
        } else {
            saveButton.disabled = true
        }
    } else {
        if (orgSelect.value !== '-1') {
            enableButton.disabled = false
        } else {
            enableButton.disabled = true
        }
    }
}

function orgSelectOnChange() {
    const orgSelect = document.getElementById('eventbrite-org-select') as HTMLSelectElement
    const advancedConfigBlock = document.getElementById('eventbrite-advanced-config-block') as HTMLElement

    if (orgSelect.value !== currentConfig.EVENTBRITE_ORGANISATION_ID) {
        advancedConfigBlock.style.display = 'none'
    }
    else {
        advancedConfigBlock.style.display = 'block'
    }
    

    checkIfConentUpdated()
}

function toggleEventbriteIntegrationOnChange() {
    const toggle = document.getElementById('toggle-eventbrite-switch') as HTMLInputElement
    const tokenBlock = document.getElementById('eventbrite-token-block') as HTMLElement
    const orgSelectBlock = document.getElementById('eventbrite-org-selection-block') as HTMLElement
    const verifyButton = document.getElementById('eventbrite-api-token-verify-button') as HTMLButtonElement
    const advancedConfigBlock = document.getElementById('eventbrite-advanced-config-block') as HTMLElement

    toggleOnUpdate()

    if (!tokenBlock) {
        return
    }

    let checked = toggle.checked
    if (checked) {
        tokenBlock.style.display = 'block'
        if (currentConfig.EVENTBRITE_ENABLED) {
            orgSelectBlock.style.display = 'block'
            advancedConfigBlock.style.display = 'block'
        }
    } else {
        tokenBlock.style.display = 'none'
        orgSelectBlock.style.display = 'none'
        advancedConfigBlock.style.display = 'none'
    }

    if (!currentConfig.EVENTBRITE_ENABLED) {
        verifyButton.innerHTML = 'Verify'
        verifyButton.disabled = false
    }
}

async function verifyPrivateApiToken() {
    const orgSelectBlock = document.getElementById('eventbrite-org-selection-block') as HTMLElement
    const tokenInput = document.getElementById('eventbrite-api-token-input') as HTMLInputElement
    const verifyButton = document.getElementById('eventbrite-api-token-verify-button') as HTMLButtonElement

    if (!loadingIcon) {
        await getIconData('loading')
    }
    let iconDiv = document.createElement('div')
    iconDiv.innerHTML = loadingIcon
    verifyButton.innerHTML = ''
    verifyButton.appendChild(iconDiv)
    iconDiv.classList.add('element-spin')

    tokenUpdated = true

    let token = tokenInput.value
    let verified = await verifyEventbriteApiToken(token)

    if (verified === true) {

        if (!tickIcon) {
            tickIcon = await getIconData('check')
        }

        let organisations = await getEventbriteUserOrganisations(token)

        if (organisations.length <= 0) {
            console.log('ERROR')
            // TODO: ADD more stuff later
            return
        }

        populateOrgSelect(organisations)

        iconDiv.classList.remove('element-spin')
        iconDiv.innerHTML = tickIcon
        verifyButton.disabled = true

        orgSelectBlock.style.display = 'block'
    } else {
        if (!xIcon) {
            xIcon = await getIconData('x')
        }

        iconDiv.classList.remove('element-spin')
        iconDiv.classList.add('element-shake')
        iconDiv.innerHTML = xIcon
        verifyButton.disabled = true
    }

}

function populateOrgSelect(organisations:[EventbriteOrganisation], selectedId:string|null=null) {
    const orgSelect = document.getElementById('eventbrite-org-select')

    emptyElement(orgSelect)

    let defaultOption = document.createElement('option')
    defaultOption.disabled = true
    defaultOption.value = '-1'
    defaultOption.text = 'Select an Organisation'
    defaultOption.selected = true
    orgSelect.appendChild(defaultOption)
    for (const org of organisations) {
        let option = document.createElement('option')
        option.value = org.id
        option.text = org.name
        if (org.id === selectedId) {
            option.selected = true
        }
        orgSelect.appendChild(option)
    }
}

function tokenTextBoxOnInput() {
    const verifyButton = document.getElementById('eventbrite-api-token-verify-button') as HTMLButtonElement
    verifyButton.innerHTML = 'Verify'
    verifyButton.disabled = false

    const enableButton = document.getElementById('eventbrite-enable-button') as HTMLButtonElement
    enableButton.disabled = true

    const orgSelectBlock = document.getElementById('eventbrite-org-selection-block')
    const advancedConfigBlock = document.getElementById('eventbrite-advanced-config-block') as HTMLElement

    orgSelectBlock.style.display = 'none'
    advancedConfigBlock.style.display = 'none'
}

function populateEventSelect(events:EventbriteEvent[], parent:HTMLElement) {
    const eventSelect = document.getElementById('eventbrite-event-select')

    emptyElement(eventSelect)

    let defaultOption = document.createElement('option')
    defaultOption.disabled = true
    defaultOption.value = '-1'
    defaultOption.text = 'Select an Event'
    defaultOption.selected = true
    eventSelect.appendChild(defaultOption)
    for (const event of events) {
        let option = document.createElement('option')
        option.value = event.id
        option.text = event.name
        if (event.id === currentConfig.EVENTBRITE_CONFIG_EVENT_ID) {
            option.selected = true
        }
        eventSelect.appendChild(option)
    }
}

function eventSelectOnChange() {
    const eventSelect = document.getElementById('eventbrite-event-select') as HTMLSelectElement
    const attendeeImportConfigBlock = document.getElementById('attendee-import-options-block') as HTMLDivElement

    if (eventSelect.value !== currentConfig.EVENTBRITE_CONFIG_EVENT_ID) {
        attendeeImportConfigBlock.style.display = 'none'
    } else {
        attendeeImportConfigBlock.style.display = 'block'
    }

    checkIfConentUpdated()
}

async function populateTicketTypeSelectGroup() {
    const selectGroup = document.getElementById('ticket-type-selection-container')
    emptyElement(selectGroup)

    const response = await getEventbriteTicketTypes()

    for(const type of response) {
        let checked = false

        if (currentConfig.EVENTBRITE_REGISTERABLE_TICKET_TYPES) {
            checked = true ? currentConfig.EVENTBRITE_REGISTERABLE_TICKET_TYPES.split(',').includes(type.name) : false
        }

        const option = buildRadioInputSelectionGroup(type.name, type.description, type.name, 'ticket-type', checked, checkIfConentUpdated, false)
        selectGroup.appendChild(option)
    }
}

// EVent Listeners
document.addEventListener("DOMContentLoaded", setupPage);

document.addEventListener("DOMContentLoaded", () => {
    const toggleSwitch = document.getElementById('toggle-eventbrite-switch')
    toggleSwitch.onchange = toggleEventbriteIntegrationOnChange

    const verifyButton = document.getElementById('eventbrite-api-token-verify-button')
    verifyButton.onclick = verifyPrivateApiToken

    const tokenInput = document.getElementById('eventbrite-api-token-input') as HTMLInputElement
    tokenInput.oninput = tokenTextBoxOnInput

    tokenInput.addEventListener('focus', function() {
        if (this.value === tokenPlaceholder) {
            this.value = '';
        }
    });

    tokenInput.addEventListener('blur', function() {
        if (this.value === '') {
            this.value = tokenPlaceholder;
        }
    });
});

document.addEventListener("DOMContentLoaded", async () => {
    // Load icons in
    loadingIcon = await getIconData('loading')
    tickIcon = await getIconData('check')
    xIcon = await getIconData('x')

});
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).orgSelectOnChange = orgSelectOnChange;
        (<any>window).eventSelectOnChange = eventSelectOnChange;
        (<any>window).toggleEventbriteIntegrationOnChange = toggleEventbriteIntegrationOnChange;
        (<any>window).eventbriteIntegrationSaveOnClick = eventbriteIntegrationSaveOnClick;
        (<any>window).eventbriteIntegrationEnableOnClick = eventbriteIntegrationEnableOnClick;
        (<any>window).eventbriteIntegrationDisableOnClick = eventbriteIntegrationDisableOnClick;
    }
});