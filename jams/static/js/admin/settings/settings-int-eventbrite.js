import { verifyEventbriteApiToken, getIconData, getEventbriteUserOrganisations, enableEventbriteIntegration, getEventbriteIntegrationConfig } from "../../global/endpoints.js"
import { emptyElement } from "../../global/helper.js"
import { ConfigType } from "../../global/configuration.js"

let loadingIcon
let tickIcon

async function setupPage() {
    ConfigType.EVENTBRITE_BEARER_TOKEN
    const eventbriteConfig = await getEventbriteIntegrationConfig()
    console.log(eventbriteConfig.ConfigType.EVE)
}

function toggleEventbriteIntegrationOnChange() {
    const toggle = document.getElementById('toggle-eventbrite-switch')
    const tokenBlock = document.getElementById('eventbrite-token-block')
    const orgSelectBlock = document.getElementById('eventbrite-org-selection-block')
    const verifyButton = document.getElementById('eventbrite-api-token-verify-button')
    let checked = toggle.checked

    if (!tokenBlock) {
        return
    }
    if (checked) {
        tokenBlock.style.display = 'block'
    } else {
        tokenBlock.style.display = 'none'
        orgSelectBlock.style.display = 'none'
        verifyButton.innerHTML = 'Verify'
    }
}

async function verifyPrivateApiToken() {
    const orgSelectBlock = document.getElementById('eventbrite-org-selection-block')
    const tokenInput = document.getElementById('eventbrite-api-token-input')
    const verifyButton = document.getElementById('eventbrite-api-token-verify-button')

    if (!loadingIcon) {
        await getIconData('loading')
    }
    let iconDiv = document.createElement('div')
    iconDiv.innerHTML = loadingIcon
    verifyButton.innerHTML = ''
    verifyButton.appendChild(iconDiv)
    iconDiv.classList.add('icon-spin')

    let token = tokenInput.value
    let verified = await verifyEventbriteApiToken(token)

    if (verified === true) {

        if (!tickIcon) {
            tickIcon = await getIconData('check')
        }

        let organisations = await getEventbriteUserOrganisations()

        if (organisations.length <= 0) {
            console.log('ERROR')
            // TODO: ADD more stuff later
            return
        }

        const orgSelect = document.getElementById('eventbrite-org-select')
        for (const org of organisations) {
            let option = document.createElement('option')
            option.value = org.id
            option.text = org.name
            orgSelect.appendChild(option)
        }

        iconDiv.classList.remove('icon-spin')
        iconDiv.innerHTML = tickIcon

        orgSelectBlock.style.display = 'block'

        await enableEventbriteIntegration(token)

    }

}

function tokenTextBoxOnInput() {
    const verifyButton = document.getElementById('eventbrite-api-token-verify-button')
    verifyButton.innerHTML = 'Verify'

    const orgSelectBlock = document.getElementById('eventbrite-org-selection-block')
    const orgSelect = document.getElementById('eventbrite-org-select')

    emptyElement(orgSelect)
    orgSelectBlock.style.display = 'none'
}

// EVent Listeners
document.addEventListener("DOMContentLoaded", setupPage);

document.addEventListener("DOMContentLoaded", () => {
    const toggleSwitch = document.getElementById('toggle-eventbrite-switch')
    toggleSwitch.onchange = toggleEventbriteIntegrationOnChange

    const verifyButton = document.getElementById('eventbrite-api-token-verify-button')
    verifyButton.onclick = verifyPrivateApiToken

    const tokenInput = document.getElementById('eventbrite-api-token-input')
    tokenInput.oninput = tokenTextBoxOnInput
});

document.addEventListener("DOMContentLoaded", async () => {
    // Load icons in
    loadingIcon = await getIconData('loading')
    tickIcon = await getIconData('check')
});