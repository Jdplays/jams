import { disableDiscordIntegrationConfig, enableDiscordIntegration, getDiscordIntegrationConfig, saveDiscordIntegrationConfig, verifyDiscordBotToken, verifyDiscordClientSecret } from "@global/endpoints"
import { DiscordBotStartupResponse, DiscordGuild, DiscordIntegrationConfig } from "@global/endpoints_interfaces"
import { addSpinnerToElement, createDropdown, emptyElement, errorToast, isDefined, isNullEmptyOrSpaces, removeSpinnerFromElement, successToast } from "@global/helper"
import { startupDiscordIntegrationGuildList } from "@global/sse_endpoints"
import { SSEManager } from "@global/sse_manager"

let configError:boolean = false
let currentConfig:DiscordIntegrationConfig = null
let setupIndex:number = 0
let guildList:DiscordGuild[] = []
let guildScanSSEHandler:SSEManager<DiscordBotStartupResponse> = null

function setupPage() {
    const setupBlock = document.getElementById('discord-setup-form') as HTMLElement
    const optionsBlock = document.getElementById('discord-config') as HTMLElement
    const footerActions = document.getElementById('discord-config-footer-actions') as HTMLElement
    const tokenInput = document.getElementById('discord-bot-token-input') as HTMLInputElement
    const loadingBar = document.getElementById('discord-bot-add-loading-bar') as HTMLElement
    loadingBar.style.display = 'block'

    if (!currentConfig || !currentConfig.DISCORD_BOT_ENABLED) {
        setupBlock.style.display = 'block'
        optionsBlock.style.display = 'none'

        footerActions.style.display = 'none'

        incrementSetupStep(true)
    } else {
        setupBlock.style.display = 'none'
        optionsBlock.style.display = 'block'

        footerActions.style.display = 'block'

        populateOptions()
    }

    tokenInput.value = ''
    checkIfContentUpdated()
    tokenTextBoxOnInput()
    secretTextBoxOnInput()
}

function populateOptions() {
    const enabledText = document.getElementById('discord-bot-enabled-text') as HTMLElement
    const errorText = document.getElementById('discord-bot-error-text') as HTMLElement
    const serverNameText = document.getElementById('discord-bot-server-name') as HTMLElement
    const channelSelectContainer = document.getElementById('discord-bot-ann-channel-select-container') as HTMLElement
    const dmReminderToggle = document.getElementById('discord-bot-toggle-dm-switch') as HTMLInputElement
    const nameSyncToggle = document.getElementById('discord-bot-toggle-sync-switch') as HTMLInputElement
    const nameSyncButton = document.getElementById('discord-bot-toggle-sync-Button') as HTMLButtonElement

    if (configError) {
        enabledText.style.display = 'none'
        errorText.style.display = 'block'

        if (currentConfig.DISCORD_BOT_CHANNELS.length === 0) {
            channelSelectContainer.innerHTML = 'No Channels'
        }

        return
    }
    enabledText.style.display = 'block'
    errorText.style.display = 'none'

    serverNameText.innerHTML = currentConfig.DISCORD_BOT_GUILD_NAME
    
    const channelSelect = createDropdown(currentConfig.DISCORD_BOT_CHANNELS, 'Select a Channel', checkIfContentUpdated, currentConfig.DISCORD_BOT_ANNOUNCEMENT_CHANNEL_ID)
    channelSelect.classList.add('form-control', 'form-select')
    channelSelect.style.width = '100%'
    emptyElement(channelSelectContainer)
    channelSelectContainer.appendChild(channelSelect)

    dmReminderToggle.checked = currentConfig.DISCORD_BOT_DM_ENABLED
    nameSyncToggle.checked = currentConfig.DISCORD_BOT_NAME_SYNC_ENABLED
    nameSyncButton.disabled = !currentConfig.DISCORD_BOT_NAME_SYNC_ENABLED


}

function checkIfContentUpdated() {
    const saveButton = document.getElementById('discord-save-button') as HTMLButtonElement
    const channelSelectContainer = document.getElementById('discord-bot-ann-channel-select-container') as HTMLElement
    const channelSelect = channelSelectContainer.querySelector('select')
    const dmReminderToggle = document.getElementById('discord-bot-toggle-dm-switch') as HTMLInputElement
    const nameSyncToggle = document.getElementById('discord-bot-toggle-sync-switch') as HTMLInputElement

    if (currentConfig.DISCORD_BOT_ENABLED) {
        if (channelSelect.value !== currentConfig.DISCORD_BOT_ANNOUNCEMENT_CHANNEL_ID ||
            dmReminderToggle.checked !== currentConfig.DISCORD_BOT_DM_ENABLED ||
            nameSyncToggle.checked !== currentConfig.DISCORD_BOT_NAME_SYNC_ENABLED) 
        {
            saveButton.disabled = false
        } else {
            saveButton.disabled = true
        }
    }
}

function saveDiscordConfigOnClick() {
    const channelSelectContainer = document.getElementById('discord-bot-ann-channel-select-container') as HTMLElement
    const channelSelect = channelSelectContainer.querySelector('select')
    const dmReminderToggle = document.getElementById('discord-bot-toggle-dm-switch') as HTMLInputElement
    const nameSyncToggle = document.getElementById('discord-bot-toggle-sync-switch') as HTMLInputElement

    const data:Partial<DiscordIntegrationConfig> = {
        DISCORD_BOT_ANNOUNCEMENT_CHANNEL_ID: channelSelect.value,
        DISCORD_BOT_DM_ENABLED: dmReminderToggle.checked,
        DISCORD_BOT_NAME_SYNC_ENABLED: nameSyncToggle.checked
    }

    saveDiscordIntegrationConfig(data).then((response) => {
        successToast('Configuration successfully updated')
        currentConfig = response.data
        configError = false
    }).catch((response) => {
        const message = response.responseJSON ? response.responseJSON.message : 'An Unknown Error Occurred';
        const data = response.responseJSON ? response.responseJSON.data : null;
        errorToast(message)
        currentConfig = data
        configError = true
    }).finally(() => {
        setupPage()
    })
}

function disableDiscordIntegrationOnClick() {
    disableDiscordIntegrationConfig().then((response) => {
        successToast(response.message)
        currentConfig = response.data
        configError = false
    }).catch((response) => {
        const message = response.responseJSON ? response.responseJSON.message : 'An Unknown Error Occurred';
        const data = response.responseJSON ? response.responseJSON.data : null;
        errorToast(message)
        currentConfig = data
        configError = true
    }).finally(() => {
        setupPage()
    })
}

function verifyDiscordBotTokenOnClick() {
    const input = document.getElementById('discord-bot-token-input') as HTMLInputElement
    const verifyButton = document.getElementById('discord-bot-token-verify-button') as HTMLButtonElement
    if (isNullEmptyOrSpaces(input.value)) {
        errorToast('Please input a token')
        return
    }
    
    const tmpToken = input.value.trim()

    verifyButton.disabled = true
    verifyButton.innerHTML = ''
    addSpinnerToElement(verifyButton)

    verifyDiscordBotToken(tmpToken).then((verified) => {
        if (verified) {
            const botAddToServerURL = document.getElementById('discord-bot-add-to-server-url') as HTMLInputElement
            guildScanSSEHandler = startupDiscordIntegrationGuildList()

            guildScanSSEHandler.onUpdate((data) => {
                if (data.status === 'READY') {
                    const verifyButton = document.getElementById('discord-bot-token-verify-button') as HTMLButtonElement

                    successToast('Token Valid')
                    removeSpinnerFromElement(verifyButton)
                    const tickIcon = document.createElement('i')
                    tickIcon.id = 'discord-token-valid-icon'
                    tickIcon.classList.add('ti', 'ti-check')
                    verifyButton.appendChild(tickIcon)

                    botAddToServerURL.value = `https://discord.com/oauth2/authorize?client_id=${data.client_id}&permissions=1706588545468480&integration_type=0&scope=bot+applications.commands`
                    
                    incrementSetupStep()
                    
                    if (data.guild_list.length > 0) {
                        const loadingBar = document.getElementById('discord-bot-add-loading-bar') as HTMLElement
                        loadingBar.style.display = 'none'
                    }

                    if (guildList !== data.guild_list) {
                        guildList = data.guild_list
                        updateGuildListDropdown()
                    }
                }
            }) 
        } else {
            return Promise.reject('Token Invalid')
        }
    }).catch((error) => {
        errorToast('Token Invalid')

        removeSpinnerFromElement(verifyButton)
        const xIcon = document.createElement('i')
        xIcon.classList.add('ti', 'ti-x')
        verifyButton.appendChild(xIcon)

        verifyButton.classList.add('element-shake')
    })
}

function verifyDiscordBotSecretOnClick() {
    const input = document.getElementById('discord-bot-secret-input') as HTMLInputElement
    const verifyButton = document.getElementById('discord-bot-secret-verify-button') as HTMLButtonElement
    if (isNullEmptyOrSpaces(input.value)) {
        errorToast('Please input a client secret')
        return
    }
    
    const tmpSecret = input.value.trim()

    verifyButton.disabled = true
    verifyButton.innerHTML = ''
    addSpinnerToElement(verifyButton)

    verifyDiscordClientSecret(tmpSecret).then((verified) => {
        if (verified) {
            const verifyButton = document.getElementById('discord-bot-secret-verify-button') as HTMLButtonElement

            successToast('Client Secret Valid')
            removeSpinnerFromElement(verifyButton)
            const tickIcon = document.createElement('i')
            tickIcon.id = 'discord-token-valid-icon'
            tickIcon.classList.add('ti', 'ti-check')
            verifyButton.appendChild(tickIcon)
            
            incrementSetupStep()
            setupStepThree()
        } else {
            return Promise.reject('Client Secret Invalid')
        }
    }).catch((error) => {
        errorToast('Client Secret Invalid')

        removeSpinnerFromElement(verifyButton)
        const xIcon = document.createElement('i')
        xIcon.classList.add('ti', 'ti-x')
        verifyButton.appendChild(xIcon)

        verifyButton.classList.add('element-shake')
    })
}

function tokenTextBoxOnInput() {
    const input = document.getElementById('discord-bot-token-input') as HTMLInputElement
    const verifyButton = document.getElementById('discord-bot-token-verify-button') as HTMLButtonElement
    verifyButton.innerHTML = 'Verify'
    
    if (isNullEmptyOrSpaces(input.value)) {
        verifyButton.disabled = true
    } else {
        verifyButton.disabled = false
    }
}

function secretTextBoxOnInput() {
    const input = document.getElementById('discord-bot-secret-input') as HTMLInputElement
    const verifyButton = document.getElementById('discord-bot-secret-verify-button') as HTMLButtonElement
    verifyButton.innerHTML = 'Verify'
    
    if (isNullEmptyOrSpaces(input.value)) {
        verifyButton.disabled = true
    } else {
        verifyButton.disabled = false
    }
}

function setupStepThree() {
    if (guildList.length > 0 && setupIndex === 2) {
        incrementSetupStep()
    }
}

function incrementSetupStep(reset:boolean=false) {
    let desiredIndex = setupIndex += 1
    if (reset) {
        desiredIndex = 0
    }

    setupIndex = desiredIndex

    for (let i=0; i<4;i++) {
        const stepElement = document.getElementById(`discord-setup-step-${i+1}`) as HTMLElement
        if (i === desiredIndex) {
            stepElement.classList.add('active')
            stepElement.style.display = 'block'
            continue
        }

        stepElement.classList.remove('active')

        if (i > setupIndex) {
            stepElement.style.display = 'none'
        }
    }
}

function updateGuildListDropdown() {
    const selectionContainer = document.getElementById('discord-bot-server-section-container')

    const select = createDropdown(guildList, 'Select Server', DiscordServerSelectOnChange, currentConfig.DISCORD_BOT_GUILD_ID)
    select.id = 'discord-server-select'
    emptyElement(selectionContainer)
    selectionContainer.appendChild(select)

    selectionContainer.querySelector('select').classList.add('form-control', 'form-select')
}

function DiscordServerSelectOnChange() {
    const serverSelect = document.getElementById('discord-server-select') as HTMLSelectElement
    const enableButton = document.getElementById('discord-enable-button') as HTMLButtonElement
    if (serverSelect.value !== '-1') {
        enableButton.style.display = 'block'
    }
}

function discordIntegrationEnableOnClick() {
    const serverSelect = document.getElementById('discord-server-select') as HTMLSelectElement
    if (serverSelect.value !== '-1') {
        enableDiscordIntegration(serverSelect.value).then((response) => {
            successToast(response.message)
            currentConfig = response.data
            configError = false
            guildScanSSEHandler.stop()
        }).catch((response) => {
            const data = response.responseJSON ? response.responseJSON.data : null;
            currentConfig = data
            configError = true
            errorToast('An unknown error occurred')
        }).finally (() => {
            setupPage()
        })
    }
}

function copyDiscordBotAddURL() {
    const copyButton = document.getElementById('discord-bot-copy-add-url-button') as HTMLButtonElement
    const botAddToServerURL = document.getElementById('discord-bot-add-to-server-url') as HTMLInputElement

    navigator.clipboard.writeText(botAddToServerURL.value)

    copyButton.querySelector('i').className = 'ti ti-check'
    
}

document.addEventListener("DOMContentLoaded", () => {
    tokenTextBoxOnInput()

    getDiscordIntegrationConfig().then((response) => {
        currentConfig = response.data
        configError = false
    }).catch((response) => {
        const data = response.responseJSON ? response.responseJSON.data : null;
        currentConfig = data
        configError = true
        errorToast('An error occurred with the configuration')
    }).finally (() => {
        setupPage()
    })
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).verifyDiscordBotTokenOnClick = verifyDiscordBotTokenOnClick;
        (<any>window).tokenTextBoxOnInput = tokenTextBoxOnInput;
        (<any>window).copyDiscordBotAddURL = copyDiscordBotAddURL;
        (<any>window).discordIntegrationEnableOnClick = discordIntegrationEnableOnClick;
        (<any>window).checkIfContentUpdated = checkIfContentUpdated;
        (<any>window).saveDiscordConfigOnClick = saveDiscordConfigOnClick;
        (<any>window).disableDiscordIntegrationOnClick = disableDiscordIntegrationOnClick;
        (<any>window).verifyDiscordBotSecretOnClick = verifyDiscordBotSecretOnClick;
        (<any>window).secretTextBoxOnInput = secretTextBoxOnInput;
    }
});