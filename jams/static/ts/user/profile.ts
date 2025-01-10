import { getRoles, getUser } from "@global/endpoints";
import { Role, User } from "@global/endpoints_interfaces";
import { buildRoleBadge, buildUserAvatar, isDefined, isNullEmptyOrSpaces } from "@global/helper";

let userId:number = 0;
let userData:Partial<User> = null;
let rolesMap:Record<number,Role> = {};

function editOnClick() {
    const viewProfileBlock = document.getElementById('view-profile') as HTMLElement
    const editProfileBlock = document.getElementById('edit-profile') as HTMLElement
    const saveActionsRow = document.getElementById('save-actions') as HTMLElement

    viewProfileBlock.style.display = 'none'
    editProfileBlock.style.display = 'block'
    saveActionsRow.style.display = 'block'
}

function cancelEditOnClick() {
    const viewProfileBlock = document.getElementById('view-profile') as HTMLElement
    const editProfileBlock = document.getElementById('edit-profile') as HTMLElement
    const saveActionsRow = document.getElementById('save-actions') as HTMLElement

    viewProfileBlock.style.display = 'block'
    editProfileBlock.style.display = 'none'
    saveActionsRow.style.display = 'none'
}

function populateProfilePage() {
    // Populate View Elements
    const avatarContainer = document.getElementById('user-avatar-container') as HTMLDivElement
    const displayName = document.getElementById('user-display-name') as HTMLElement
    const rolesContainer = document.getElementById('user-roles-container') as HTMLDivElement
    const bioElements = document.querySelectorAll<HTMLElement>('#user-bio')

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

}

async function preloadRoles() {
    const response = await getRoles();
    let roles = response.data
    let rolesMap:Record<number,Role> = {};
    roles.forEach(role => {
        rolesMap[role.id] = role;
    });
    return rolesMap;
}

// Event listeners
document.addEventListener("DOMContentLoaded", async function () {
    const userIdElement = document.getElementById('user-id') as HTMLDivElement
    userId = Number(userIdElement.getAttribute('data-user-id'))

    // Run both asynchronous functions concurrently
    const [rolesResponse, userDataResponse] = await Promise.all([
        preloadRoles(),
        getUser(userId)
    ]);

    rolesMap = rolesResponse
    userData = userDataResponse as Partial<User>

    populateProfilePage()
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).editOnClick = editOnClick;
        (<any>window).cancelEditOnClick = cancelEditOnClick;
    }
});