import { editGeneralConfig, getGeneralConfig } from "@global/endpoints";
import { GeneralConfig } from "@global/endpoints_interfaces";
import { errorToast, isDefined, successToast } from "@global/helper";
import { allTimezones } from "@global/timezones";

let currentConfig:Partial<GeneralConfig>|null=null

function checkIfConentUpdated() {
    const saveButton = document.getElementById('save-button') as HTMLButtonElement

    const locationSelect = document.getElementById('loc-select') as HTMLSelectElement

    if (locationSelect.value !== currentConfig.TIMEZONE) {
        saveButton.disabled = false
    } else {
        saveButton.disabled = true
    }
}

function populateLocationSelect() {
    const locationSelect = document.getElementById('loc-select') as HTMLSelectElement

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

async function setupPage() {
    if (!currentConfig) {
        currentConfig = await getGeneralConfig()
    }

    populateLocationSelect()
}

function generalConfigSaveOnClick() {
    const locationSelect = document.getElementById('loc-select') as HTMLSelectElement

    const data:GeneralConfig = {
        TIMEZONE: locationSelect.value
    }

    editGeneralConfig(data).then((response) => {
        successToast('Config Successfully Updated')
    }).catch( () => {
        errorToast()
    }) 
}

// Event Listeners
document.addEventListener("DOMContentLoaded", setupPage);

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).checkIfConentUpdated = checkIfConentUpdated;
        (<any>window).generalConfigSaveOnClick = generalConfigSaveOnClick;
    }
});