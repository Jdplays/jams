import { deleteOAuthConfiguration, editAuthConfiguration, getAuthConfiguration } from "@global/endpoints";
import { AuthConfiguration } from "@global/endpoints_interfaces";
import { isDefined, emptyElement, isNullEmptyOrSpaces, successToast, errorToast, validateTextInput, animateElement } from "@global/helper";
import { InputValidationPattern } from "@global/interfaces";

let clientSecretPlaceholder:string = '*****************'

let providerNameInputValid:boolean = false
let configUrlInputValid:boolean = false
let clientIdInputValid:boolean = false
let clientSecretInputValid:boolean = false

let currentConfig:Partial<AuthConfiguration>|null=null

function deleteOAuthConfigButtonOnClick() {
    const oauthForm = document.getElementById('oauth-config-form') as HTMLElement
    
    deleteOAuthConfiguration().then(() => {
        successToast('OAuth Configuration successfully removed')
        oauthForm.style.display = 'none'
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    }).finally(() => {
        populateAuthConfig()
    })
}

function editButtonOAuthOnClick() {
    const oauthForm = document.getElementById('oauth-config-form') as HTMLElement
    
    oauthForm.style.display = 'block'
}

function addButtonOAuthOnClick() {
    const oAuthCard = document.getElementById('oauth-card') as HTMLDivElement
    const addOAuthButton = document.getElementById('add-oauth-button') as HTMLButtonElement

    const oAuthProviderName = document.getElementById('oauth-provider-name') as HTMLLabelElement
    const oAuthStatus = document.getElementById('oauth-status') as HTMLLabelElement
    const oAuthSwitch = document.getElementById('toggle-oauth-switch') as HTMLInputElement
    const oauthForm = document.getElementById('oauth-config-form') as HTMLElement

    oAuthProviderName.innerHTML = 'Provider'
    oAuthStatus.innerHTML = 'Unconfigured'
    oAuthSwitch.checked = false
    oAuthSwitch.disabled = true
    
    oauthForm.style.display = 'block'

    oAuthCard.style.display = 'block'
    addOAuthButton.style.display = 'none'
}

function saveOAuthOnClick() {
    const oauthForm = document.getElementById('oauth-config-form') as HTMLElement
    const oauthSaveButton = document.getElementById('oauth-save-button') as HTMLButtonElement

    const editOAuthProviderName = document.getElementById('edit-oauth-provider-name') as HTMLInputElement
    const editOAuthConfigURL = document.getElementById('edit-oauth-config-url') as HTMLInputElement
    const editOAuthClientID = document.getElementById('edit-oauth-client-id') as HTMLInputElement
    const editOAuthClientSecret = document.getElementById('edit-oauth-client-secret') as HTMLInputElement

    editOAuthProviderName.dispatchEvent(new Event('input', { bubbles: true }))
    editOAuthConfigURL.dispatchEvent(new Event('input', { bubbles: true }))
    editOAuthClientID.dispatchEvent(new Event('input', { bubbles: true }))
    editOAuthClientSecret.dispatchEvent(new Event('input', { bubbles: true }))

    if (!providerNameInputValid || !configUrlInputValid || !clientIdInputValid || !clientSecretInputValid) {
        animateElement(oauthSaveButton, 'element-shake')
        return
    }

    const data:Partial<AuthConfiguration> = {
        OAUTH_PROVIDER_NAME: editOAuthProviderName.value,
        OAUTH_DISCOVERY_DOCUMENT_URL: editOAuthConfigURL.value,
        OAUTH_CLIENT_ID: editOAuthClientID.value
    }

    if (editOAuthClientSecret.value !== clientSecretPlaceholder) {
        data.OAUTH_CLIENT_SECRET = editOAuthClientSecret.value
    }

    editAuthConfiguration(data).then((response) => {
        successToast(response.message)
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    }).finally(() => {
        populateAuthConfig()
    })
    
    oauthForm.style.display = 'none'
}

function toggleLocalAuthOnChange() {
    const localAuthSwitch = document.getElementById('toggle-local-auth-switch') as HTMLInputElement

    const data:Partial<AuthConfiguration> = {
        LOCAL_AUTH_ENABLED: localAuthSwitch.checked
    }

    editAuthConfiguration(data).then( () => {
        const enabledText = localAuthSwitch.checked ? 'Enabled' : 'Disabled'
        successToast(`Local Auth successfully ${enabledText}`)
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    }).finally(() => {
        populateAuthConfig()
    })
}

function toggleOAuthOnChange() {
    const oAuthSwitch = document.getElementById('toggle-oauth-switch') as HTMLInputElement

    const data:Partial<AuthConfiguration> = {
        OAUTH_ENABLED: oAuthSwitch.checked
    }

    editAuthConfiguration(data).then( () => {
        const enabledText = oAuthSwitch.checked ? 'Enabled' : 'Disabled'
        successToast(`${currentConfig.OAUTH_PROVIDER_NAME} OAuth provider successfully ${enabledText}`)
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    }).finally(() => {
        populateAuthConfig()
    })
}

async function populateAuthConfig() {
    const authSourcesContainer = document.getElementById('auth-sources-container') as HTMLDivElement
    const authConfigLoadingBar = document.getElementById('auth-config-loading-bar') as HTMLDivElement

    authSourcesContainer.style.display = 'none'
    authConfigLoadingBar.style.display = 'block'
    // Get the config
    const authConfig = await getAuthConfiguration()
    currentConfig = authConfig

    // Local Auth Elements
    const localAuthStatus = document.getElementById('local-auth-status') as HTMLLabelElement
    const localAuthSwitch = document.getElementById('toggle-local-auth-switch') as HTMLInputElement

    emptyElement(localAuthStatus)
    let localStatusBadge = document.createElement('span')
    localStatusBadge.classList.add('badge', 'ms-auto')
    if (authConfig.LOCAL_AUTH_ENABLED) {
        localStatusBadge.classList.add('bg-green')
        localAuthStatus.innerHTML = 'Active '

    } else {
        localStatusBadge.classList.add('bg-red')
        localAuthStatus.innerHTML = 'Inactive '
    }
    localAuthStatus.appendChild(localStatusBadge)

    localAuthSwitch.checked = authConfig.LOCAL_AUTH_ENABLED

    // OAuth Elements
    const oAuthCard = document.getElementById('oauth-card') as HTMLDivElement
    const addOAuthButton = document.getElementById('add-oauth-button') as HTMLButtonElement
    if (!isNullEmptyOrSpaces(authConfig.OAUTH_PROVIDER_NAME)) {
        oAuthCard.style.display = 'block'
        addOAuthButton.style.display = 'none'

        const oAuthProviderName = document.getElementById('oauth-provider-name') as HTMLLabelElement
        const oAuthStatus = document.getElementById('oauth-status') as HTMLLabelElement
        const oAuthSwitch = document.getElementById('toggle-oauth-switch') as HTMLInputElement

        oAuthProviderName.innerHTML = `${authConfig.OAUTH_PROVIDER_NAME} (OAuth)`
        oAuthSwitch.disabled = false

        emptyElement(oAuthStatus)
        let oauthStatusBadge = document.createElement('span')
        oauthStatusBadge.classList.add('badge', 'ms-auto')
        if (authConfig.OAUTH_ENABLED) {
            oauthStatusBadge.classList.add('bg-green')
            oAuthStatus.innerHTML = 'Active '

        } else {
            oauthStatusBadge.classList.add('bg-red')
            oAuthStatus.innerHTML = 'Inactive '
        }
        oAuthStatus.appendChild(oauthStatusBadge)

        oAuthSwitch.checked = authConfig.OAUTH_ENABLED

        // OAuth Form elements
        const editOAuthProviderName = document.getElementById('edit-oauth-provider-name') as HTMLInputElement
        const editOAuthConfigURL = document.getElementById('edit-oauth-config-url') as HTMLInputElement
        const editOAuthClientID = document.getElementById('edit-oauth-client-id') as HTMLInputElement
        const editOAuthClientSecret = document.getElementById('edit-oauth-client-secret') as HTMLInputElement

        editOAuthProviderName.value = authConfig.OAUTH_PROVIDER_NAME
        editOAuthConfigURL.value = authConfig.OAUTH_DISCOVERY_DOCUMENT_URL
        editOAuthClientID.value = authConfig.OAUTH_CLIENT_ID
        editOAuthClientSecret.value = clientSecretPlaceholder
    } else {
        oAuthCard.style.display = 'none'
        addOAuthButton.style.display = 'block'
    }

    authSourcesContainer.style.display = 'block'
    authConfigLoadingBar.style.display = 'none'
}

// Event Listeners
document.addEventListener("DOMContentLoaded", populateAuthConfig);

document.addEventListener("DOMContentLoaded", () => {
    const oAuthclientSecretInput = document.getElementById('edit-oauth-client-secret') as HTMLInputElement

    oAuthclientSecretInput.addEventListener('focus', function() {
        if (this.value === clientSecretPlaceholder) {
            this.value = '';
            oAuthclientSecretInput.dispatchEvent(new Event('input', { bubbles: true }))
        }
    });

    oAuthclientSecretInput.addEventListener('blur', function() {
        if (this.value === '') {
            this.value = clientSecretPlaceholder;
            oAuthclientSecretInput.dispatchEvent(new Event('input', { bubbles: true }))
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // Provider Name
    const oAuthProviderNameInput = document.getElementById('edit-oauth-provider-name') as HTMLInputElement
    oAuthProviderNameInput.oninput = async () => {
        providerNameInputValid = validateTextInput(oAuthProviderNameInput)
    }

    // Config URL
    const oAuthConfigUrlInput = document.getElementById('edit-oauth-config-url') as HTMLInputElement
    oAuthConfigUrlInput.oninput = async () => {
        configUrlInputValid = validateTextInput(oAuthConfigUrlInput, null, true)
    }

    // Client ID
    const oAuthClientIdInput = document.getElementById('edit-oauth-client-id') as HTMLInputElement
    oAuthClientIdInput.oninput = async () => {
        clientIdInputValid = validateTextInput(oAuthClientIdInput, null, true)
    }

    // Client Secret
    const oAuthClientSecretInput = document.getElementById('edit-oauth-client-secret') as HTMLInputElement
    oAuthClientSecretInput.oninput = async () => {
        clientSecretInputValid = validateTextInput(oAuthClientSecretInput, null, true)
    }
})

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).editButtonOAuthOnClick = editButtonOAuthOnClick;
        (<any>window).saveOAuthOnClick = saveOAuthOnClick;
        (<any>window).toggleOAuthOnChange = toggleOAuthOnChange;
        (<any>window).toggleLocalAuthOnChange = toggleLocalAuthOnChange;
        (<any>window).deleteOAuthConfigButtonOnClick = deleteOAuthConfigButtonOnClick;
        (<any>window).addButtonOAuthOnClick = addButtonOAuthOnClick;
    }
});