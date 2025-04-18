import { editUser, getRolesPublicInfo, getUser, uploadUserAvatar } from "@global/endpoints";
import { Role, User } from "@global/endpoints_interfaces";
import { buildQueryString, buildRoleBadge, buildUserAvatar, compressImage, emptyElement, errorToast, isDefined, isNullEmptyOrSpaces, removeSpinnerFromElement, successToast } from "@global/helper";
import { QueryStringData } from "@global/interfaces";

let userId:number = 0;
let userData:Partial<User> = null;
let rolesMap:Record<number,Role> = {};

let userAvatarChanged:boolean = false;

function checkIfContentUpdated() {
    const saveButton = document.getElementById('save-button') as HTMLButtonElement

    const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement
    const bioInput = document.getElementById('bio-input') as HTMLInputElement
    const unsavedWarningText = document.getElementById('unsaved-warning')

    if (firstNameInput.value !== userData.first_name || lastNameInput.value !== userData.last_name || bioInput.value !== userData.bio || userAvatarChanged) {
        saveButton.disabled = false
        unsavedWarningText.style.display = 'block'
    } else {
        saveButton.disabled = true
        unsavedWarningText.style.display = 'none'
    }
}

function syncInputs(source:string) {
    const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement
    const bioInput = document.getElementById('bio-input') as HTMLInputElement

    const firstNameInputMobile = document.getElementById('first-name-input-mobile') as HTMLInputElement
    const lastNameInputMobile = document.getElementById('last-name-input-mobile') as HTMLInputElement
    const bioInputMobile = document.getElementById('bio-input-mobile') as HTMLInputElement

    if (source === 'desktop') {
        firstNameInputMobile.value = firstNameInput.value
        lastNameInputMobile.value = lastNameInput.value
        bioInputMobile.value = bioInput.value
    } else if (source === 'mobile') {
        firstNameInput.value = firstNameInputMobile.value
        lastNameInput.value = lastNameInputMobile.value
        bioInput.value = bioInputMobile.value
    }

    checkIfContentUpdated()
}


function editOnClick() {
    const viewProfileBlock = document.getElementById('view-profile') as HTMLElement
    const editProfileBlock = document.getElementById('edit-profile') as HTMLElement
    const saveActionsRow = document.getElementById('save-actions') as HTMLElement
    const editActions = document.getElementById('edit-actions') as HTMLElement

    viewProfileBlock.style.display = 'none'
    editProfileBlock.style.display = 'block'
    saveActionsRow.style.display = 'block'
    editActions.style.display = 'none'
}

function cancelEditOnClick() {
    const viewProfileBlock = document.getElementById('view-profile') as HTMLElement
    const editProfileBlock = document.getElementById('edit-profile') as HTMLElement
    const saveActionsRow = document.getElementById('save-actions') as HTMLElement
    const editActions = document.getElementById('edit-actions') as HTMLElement

    viewProfileBlock.style.display = 'block'
    editProfileBlock.style.display = 'none'
    saveActionsRow.style.display = 'none'
    editActions.style.display = 'block'

    const editAvatarContainer = document.getElementById('user-avatar-container-edit') as HTMLDivElement
    const imageInput = document.getElementById('upload-photo') as HTMLInputElement
    emptyElement(editAvatarContainer)
    editAvatarContainer.appendChild(buildUserAvatar(userData, 150))
    userAvatarChanged = false
    imageInput.value = ''

    syncInputs('desktop')
}

function populateProfilePage() {
    // Set page to view mode
    const viewProfileBlock = document.getElementById('view-profile') as HTMLElement
    const editProfileBlock = document.getElementById('edit-profile') as HTMLElement
    const saveActionsRow = document.getElementById('save-actions') as HTMLElement
    const editActions = document.getElementById('edit-actions') as HTMLElement

    viewProfileBlock.style.display = 'block'

    // Populate View Elements
    const avatarContainer = document.getElementById('user-avatar-container') as HTMLDivElement
    const editAvatarContainer = document.getElementById('user-avatar-container-edit') as HTMLDivElement
    const displayName = document.getElementById('user-display-name') as HTMLElement
    const rolesContainer = document.getElementById('user-roles-container') as HTMLDivElement
    const bioElements = document.querySelectorAll<HTMLElement>('#user-bio')

    emptyElement(avatarContainer)
    avatarContainer.appendChild(buildUserAvatar(userData, 150))
    displayName.innerHTML = userData.display_name

    for (const bioText of Array.from(bioElements)) {
        if (isNullEmptyOrSpaces(userData.bio)) {
            bioText.innerHTML = 'No Bio provided'
        } else {
            bioText.innerHTML = userData.bio
        }
    }

    // Create custom badge if applicable
    emptyElement(rolesContainer)
    if (userData.badge_text) {
        const tag = document.createElement('span')
        tag.classList.add('tag-with-indicator')
        tag.style.width = 'fit-content'
        tag.style.borderRadius = '90px'

        const text = document.createElement('span')
        text.innerHTML = userData.badge_text
        tag.appendChild(text)

        if (userData.badge_icon) {
            const icon = document.createElement('i')
            icon.classList.add('ti', `ti-${userData.badge_icon}`, 'ms-2')
            icon.style.color = 'rgb(255, 215, 0)'
            tag.appendChild(icon)
        }

        rolesContainer.appendChild(tag)
    }

    const userRoles = userData.role_ids
        .map(roleId => rolesMap[roleId])
        .filter(role => role !== undefined)
        .sort((a, b) => a.priority - b.priority)

    for (const role of userRoles) {
        if (role.hidden) {
            continue
        }

        const badge = buildRoleBadge(role)
        rolesContainer.appendChild(badge)
    }

    // Populate Edit elements
    if (editProfileBlock === null || editProfileBlock === undefined) {
        return
    }
    
    const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement
    const bioInput = document.getElementById('bio-input') as HTMLInputElement

    editProfileBlock.style.display = 'none'
    editActions.style.display = 'block'
    saveActionsRow.style.display = 'none'

    firstNameInput.value = userData.first_name
    lastNameInput.value = userData.last_name
    bioInput.value = userData.bio

    emptyElement(editAvatarContainer)
    editAvatarContainer.appendChild(buildUserAvatar(userData, 150))

    syncInputs('desktop')
}

async function preloadRoles(role_ids:number[]) {
    const data:Partial<QueryStringData> = {
            id: role_ids,
            hidden: false
        }
    const queryString = buildQueryString(data)
    const response = await getRolesPublicInfo(queryString);
    let roles = response.data
    let rolesMap:Record<number,Role> = {};
    roles.forEach(role => {
        rolesMap[role.id] = role;
    });
    return rolesMap;
}

async function uploadProfileImageOnChange() {
    const editAvatarContainer = document.getElementById('user-avatar-container-edit') as HTMLDivElement
    const imageInput = document.getElementById('upload-photo') as HTMLInputElement
    const file = imageInput.files?.[0]

    if (file) {
        const compressedBlob = await compressImage(file, 256, 256, 0.8)
        const compressedFile = new File([compressedBlob], 'profile.jpg', {type: 'image/jpeg'})

        const reader = new FileReader()
        reader.onload = function(e) {
            let avatar = editAvatarContainer.querySelector('#user-avatar') as HTMLSpanElement
            if (!avatar) {
                return
            }

            emptyElement(avatar)
            avatar.style.backgroundImage = `url(${e.target.result})`
            userAvatarChanged = true
            checkIfContentUpdated()
        }
        reader.readAsDataURL(compressedFile)
    }
}

async function saveButtonOnClick() {
    const editAvatarContainer = document.getElementById('user-avatar-container-edit') as HTMLDivElement
    const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement
    const bioInput = document.getElementById('bio-input') as HTMLInputElement
    const imageInput = document.getElementById('upload-photo') as HTMLInputElement

    let avatarUpdated = false

    let loadingModal = $('#loading-modal')
    loadingModal.modal('show')

    await new Promise(resolve => loadingModal.one('shown.bs.modal', resolve));
    if (userAvatarChanged) {
        const file = imageInput.files[0]

        const compressedBlob = await compressImage(file, 256, 256, 0.8)
        const compressedFile = new File([compressedBlob], 'profile.jpg', {type: 'image/jpeg'})
    
        const fileData = new FormData();
        fileData.append('file', compressedFile);
        
        try {
            const response = await uploadUserAvatar(fileData)
            successToast(response.message)
            avatarUpdated = true
        } catch (error:any) {
            const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
            errorToast(errorMessage)
            loadingModal.modal('hide')
            return
        }
    }

    const updatedUserData:Partial<User> = {
        'first_name': firstNameInput.value,
        'last_name': lastNameInput.value,
        'bio': bioInput.value
    }

    try {
        const response = await editUser(userId, updatedUserData)
        successToast(response.message)
        userData = response.data

        if (avatarUpdated) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        populateProfilePage()
        const navRefreshElement = document.getElementById('nav-refresh')
        navRefreshElement.setAttribute('refresh', 'true')
    } catch (error:any) {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    }

    loadingModal.modal('hide')
}

// Event listeners
document.addEventListener("DOMContentLoaded", async function () {
    const userIdElement = document.getElementById('user-id') as HTMLDivElement
    userId = Number(userIdElement.getAttribute('data-user-id'))

    userData = await getUser(userId)
    rolesMap = await preloadRoles(userData.role_ids)

    populateProfilePage()
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).editOnClick = editOnClick;
        (<any>window).cancelEditOnClick = cancelEditOnClick;
        (<any>window).uploadProfileImageOnChange = uploadProfileImageOnChange;
        (<any>window).saveButtonOnClick = saveButtonOnClick;
        (<any>window).syncInputs = syncInputs;
    }
});