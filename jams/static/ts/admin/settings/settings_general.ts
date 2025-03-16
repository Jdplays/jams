import { editGeneralConfig, getGeneralConfig, getLatestRelease, recalculateEventStats, recalculateStreaks } from "@global/endpoints";
import { GeneralConfig } from "@global/endpoints_interfaces";
import { errorToast, isDefined, isNullEmptyOrSpaces, successToast } from "@global/helper";
import { allTimezones } from "@global/timezones";

let currentConfig:Partial<GeneralConfig>|null=null

function checkIfContentUpdated() {
    const saveButton = document.getElementById('save-button') as HTMLButtonElement

    const locationSelect = document.getElementById('loc-select') as HTMLSelectElement
    const streaksSwitch = document.getElementById('toggle-streaks-switch') as HTMLInputElement
    const eventPrefixFilterInput = document.getElementById('prefix-filter-input') as HTMLInputElement

    if (locationSelect.value !== currentConfig.TIMEZONE || streaksSwitch.checked !== currentConfig.STREAKS_ENABLED || (eventPrefixFilterInput.value ?? '') !== (currentConfig.EVENT_PREFIX_FILTER ?? '')) {
        saveButton.disabled = false
    } else {
        saveButton.disabled = true
    }
}

async function populateVersionSection() {
    const releaseData = await getLatestRelease()
    const upToDateVersionBlock = document.getElementById('version-block-utd') as HTMLDivElement
    const outOfDateVersionBlock = document.getElementById('version-block-ood') as HTMLDivElement

    const upToDateVersionText = document.getElementById('version-text-utd') as HTMLSpanElement
    const outOfDateVersionText = document.getElementById('version-text-ood') as HTMLSpanElement

    if ((releaseData === null || releaseData === undefined) || isNullEmptyOrSpaces(releaseData.version)) {
        upToDateVersionBlock.style.display = 'block'
        upToDateVersionText.innerHTML = `v${currentConfig.APP_VERSION} (Cannot connect to GitHub)`
        const parent = upToDateVersionText.parentElement
        const icon = parent.querySelector('i')
        icon.className = 'ti ti-cloud-off text-danger'
        return
    }

    if (currentConfig.APP_VERSION !== releaseData.version) {
        upToDateVersionBlock.style.display = 'none'
        outOfDateVersionBlock.style.display = 'block'

        outOfDateVersionText.innerHTML = `v${currentConfig.APP_VERSION} (out of date)`

        if (releaseData.release_notes) {
            document.getElementById('release-notes').innerHTML = releaseData.release_notes
        }
        (document.getElementById('release-btn') as HTMLAnchorElement).href = releaseData.url
    } else {
        upToDateVersionBlock.style.display = 'block'
        outOfDateVersionBlock.style.display = 'none'

        upToDateVersionText.innerHTML = `v${currentConfig.APP_VERSION} (up to date)`
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
    const eventPrefixFilterInput = document.getElementById('prefix-filter-input') as HTMLInputElement

    streaksSwitch.checked = currentConfig.STREAKS_ENABLED
    refreshButton.disabled = !currentConfig.STREAKS_ENABLED
    eventPrefixFilterInput.value = currentConfig.EVENT_PREFIX_FILTER
}

async function setupPage() {
    if (!currentConfig) {
        currentConfig = await getGeneralConfig()
    }

    populateVersionSection()
    populateLocationSelect()
    populateStreaksSection()
}

function generalConfigSaveOnClick() {
    const locationSelect = document.getElementById('loc-select') as HTMLSelectElement
    const streaksSwitch = document.getElementById('toggle-streaks-switch') as HTMLInputElement
    const eventPrefixFilterInput = document.getElementById('prefix-filter-input') as HTMLInputElement

    const data:GeneralConfig = {
        TIMEZONE: locationSelect.value,
        STREAKS_ENABLED: streaksSwitch.checked,
        EVENT_PREFIX_FILTER: eventPrefixFilterInput.value
    }

    editGeneralConfig(data).then((response) => {
        currentConfig = response
        successToast('Config Successfully Updated')

        populateStreaksSection()
        checkIfContentUpdated()
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

function recalculateStatsOnClick() {
    const statusFixed = document.getElementById('stats-status-fixed') as HTMLElement
    const statusRolling = document.getElementById('stats-status-rolling') as HTMLElement
    statusFixed.style.display = 'none'
    statusRolling.style.display = 'block'

    recalculateEventStats().then((response) => {
        successToast(response.message)
        $('#confirm-recalculate-stats').modal('hide');
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    }).finally(() => {
        statusFixed.style.display = 'block'
        statusRolling.style.display = 'none'
    })

    setInterval(() => {
        

    }, 5000);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", setupPage);

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).checkIfContentUpdated = checkIfContentUpdated;
        (<any>window).generalConfigSaveOnClick = generalConfigSaveOnClick;
        (<any>window).recalculateStreaksOnClick = recalculateStreaksOnClick;
        (<any>window).recalculateStatsOnClick = recalculateStatsOnClick;
    }
});