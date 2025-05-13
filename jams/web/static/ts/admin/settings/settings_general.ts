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

function changeVersionTextIcon(textElement:HTMLElement, iconName:string, colourType:string) {
    const parent = textElement.parentElement
    const icon = parent.querySelector('i')
    icon.className = `ti ti-${iconName} text-${colourType}`
}

async function populateVersionSection() {
    const releaseData = await getLatestRelease()
    const serverVersionText = document.getElementById('server-version-text') as HTMLSpanElement
    const webVersionText = document.getElementById('web-version-text') as HTMLSpanElement

    const viewReleaseNotesButton = document.getElementById('view-release-notes-button') as HTMLButtonElement

    if ((releaseData === null || releaseData === undefined) || isNullEmptyOrSpaces(releaseData.version)) {
        // Server Version
        serverVersionText.innerHTML = `Server: v${currentConfig.SERVER_VERSION} (Cannot connect to GitHub)`
        changeVersionTextIcon(serverVersionText, 'cloud-off', 'danger')

        // Web Version
        webVersionText.innerHTML = `Web: v${currentConfig.WEB_VERSION} (Cannot connect to GitHub)`
        changeVersionTextIcon(webVersionText, 'cloud-off', 'danger')
        return
    }

    let outOfDate = false

    if (currentConfig.SERVER_VERSION !== releaseData.version) {
        serverVersionText.innerHTML = `Server: v${currentConfig.SERVER_VERSION} (out of date)`
        changeVersionTextIcon(serverVersionText, 'alert-circle', 'warning')
        outOfDate = true
    } else {
        serverVersionText.innerHTML = `Server: v${currentConfig.SERVER_VERSION} (up to date)`
        changeVersionTextIcon(serverVersionText, 'circle-check', 'success')
    }

    if (currentConfig.WEB_VERSION !== releaseData.version) {
        webVersionText.innerHTML = `Web: v${currentConfig.WEB_VERSION} (out of date)`
        changeVersionTextIcon(webVersionText, 'alert-circle', 'warning')
        outOfDate = true
    } else {
        webVersionText.innerHTML = `Web: v${currentConfig.WEB_VERSION} (up to date)`
        changeVersionTextIcon(webVersionText, 'circle-check', 'success')
    }

    if (outOfDate) {
        viewReleaseNotesButton.style.display = 'block'
        document.getElementById('release-notes').innerHTML = releaseData.release_notes
    } else {
        viewReleaseNotesButton.style.display = 'none'
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