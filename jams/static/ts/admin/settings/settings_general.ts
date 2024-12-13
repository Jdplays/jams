import { editGeneralConfig, getGeneralConfig, recalculateStreaks } from "@global/endpoints";
import { GeneralConfig } from "@global/endpoints_interfaces";
import { errorToast, isDefined, successToast } from "@global/helper";
import { allTimezones } from "@global/timezones";

let currentConfig:Partial<GeneralConfig>|null=null

function checkIfConentUpdated() {
    const saveButton = document.getElementById('save-button') as HTMLButtonElement

    const locationSelect = document.getElementById('loc-select') as HTMLSelectElement
    const streaksSwitch = document.getElementById('toggle-streaks-switch') as HTMLInputElement

    if (locationSelect.value !== currentConfig.TIMEZONE || streaksSwitch.checked !== currentConfig.STREAKS_ENABLED) {
        saveButton.disabled = false
    } else {
        saveButton.disabled = true
    }
}

function populateLocationSelect() {
    const locationSelect = document.getElementById('loc-select') as HTMLSelectElement

    let defaultOption = document.createElement('option')
    defaultOption.disabled = true
    defaultOption.value = '-1'
    defaultOption.text = 'Select a Location'
    defaultOption.selected = true
    locationSelect.appendChild(defaultOption)

    for (const timezone of allTimezones) {
        const option = document.createElement('option')
        option.value = timezone
        option.text = timezone
        if (currentConfig && timezone === currentConfig.TIMEZONE) {
            option.selected = true
        }

        locationSelect.appendChild(option)
    }
}

function populateStreaksSection() {
    const streaksSwitch = document.getElementById('toggle-streaks-switch') as HTMLInputElement
    const refreshButton = document.getElementById('streak-refresh-button') as HTMLButtonElement

    streaksSwitch.checked = currentConfig.STREAKS_ENABLED

    refreshButton.disabled = !currentConfig.STREAKS_ENABLED
}

async function setupPage() {
    if (!currentConfig) {
        currentConfig = await getGeneralConfig()
    }

    populateLocationSelect()
    populateStreaksSection()
}

function generalConfigSaveOnClick() {
    const locationSelect = document.getElementById('loc-select') as HTMLSelectElement
    const streaksSwitch = document.getElementById('toggle-streaks-switch') as HTMLInputElement

    const data:GeneralConfig = {
        TIMEZONE: locationSelect.value,
        STREAKS_ENABLED: streaksSwitch.checked
    }

    editGeneralConfig(data).then((response) => {
        currentConfig = response
        successToast('Config Successfully Updated')

        populateStreaksSection()
        checkIfConentUpdated()
    }).catch( () => {
        errorToast()
    }) 
}

function recalculateStreaksOnClick() {
    recalculateStreaks().then((response) => {
        successToast(response.message)
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

// Event Listeners
document.addEventListener("DOMContentLoaded", setupPage);

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).checkIfConentUpdated = checkIfConentUpdated;
        (<any>window).generalConfigSaveOnClick = generalConfigSaveOnClick;
        (<any>window).recalculateStreaksOnClick = recalculateStreaksOnClick;
    }
});