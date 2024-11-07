import { disableJoltIntegration, enableJoltIntegration, getJoltConfiguration, refreshJoltIntegrationAPIToken } from "@global/endpoints";
import { GeneralConfig, JOLTConfig } from "@global/endpoints_interfaces";
import { errorToast, isDefined, successToast } from "@global/helper";
import { allTimezones } from "@global/timezones";

let currentConfig:Partial<JOLTConfig>|null=null
let fullApiKey:string|null = null

function obfuscateApiKey(apiKey:string, visibleChars:number = 8) {
    if (apiKey.length <= visibleChars) return apiKey;
    const truncated = apiKey.slice(0, visibleChars);
    return truncated + '*'.repeat(apiKey.length - visibleChars);
}

async function setupPage() {
    const enabledSwitch = document.getElementById('toggle-jolt-switch') as HTMLInputElement
    const apiKeyBlock = document.getElementById('jolt-api-key-block') as HTMLDivElement
    const copyButton = document.getElementById('token-copy-button') as HTMLButtonElement
    const warningText = document.getElementById('copy-key-warning') as HTMLButtonElement

    if (!currentConfig) {
        currentConfig = await getJoltConfiguration()
    }

    enabledSwitch.checked = currentConfig.JOLT_ENABLED

    apiKeyBlock.style.display = 'none'
    copyButton.style.display = 'none'
    warningText.style.display = 'none'

    if (currentConfig.JOLT_ENABLED && currentConfig.JOLT_API_KEY_ID) {
        apiKeyBlock.style.display = 'block'

        const apiKeyInput = apiKeyBlock.querySelector('#api-key-input') as HTMLInputElement

        if (currentConfig.TOKEN) {
            copyButton.style.display = 'block'
            warningText.style.display = 'block'
        }

        apiKeyInput.value = obfuscateApiKey(currentConfig.JOLT_API_KEY_ID)
        
    }


}

function toggleJoltIntegrationOnChange() {
    const enabledSwitch = document.getElementById('toggle-jolt-switch') as HTMLInputElement
    
    if (enabledSwitch.checked) {
        enableJoltIntegration().then((config) => {
            currentConfig = config
            setupPage()
            copyAPIToken()
        })
    } else {
        let confirmDisableModal = $('#confirm-disable-jolt')
        confirmDisableModal.modal('show')

        confirmDisableModal.find('#confirm-disable-button').off('click');

        confirmDisableModal.find('#confirm-disable-button').click(() => {
            disableJoltIntegration().then((config) => {
                currentConfig = config
                successToast('JOLT successfully disabled')
                setupPage()
            }).catch(() => {
                errorToast('An error occured trying to disable JOLT')
            })
        });
        
    }

    setupPage()
}

function copyAPIToken() {
    navigator.clipboard.writeText(`${currentConfig.JOLT_API_KEY_ID}:${currentConfig.TOKEN}`).then(() => {
        successToast('API Token copied to clipboard')
    })
}

function refreshAPIToken() {
    refreshJoltIntegrationAPIToken().then((config) => {
        currentConfig = config
        setupPage()
        copyAPIToken()
    })
}

// Event Listeners
document.addEventListener("DOMContentLoaded", setupPage);

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).toggleJoltIntegrationOnChange = toggleJoltIntegrationOnChange;
        (<any>window).copyAPIToken = copyAPIToken;
        (<any>window).refreshAPIToken = refreshAPIToken;
    }
});