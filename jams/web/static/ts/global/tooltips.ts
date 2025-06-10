import { Role, User } from "./endpoints_interfaces";
import { buildRoleBadge, buildUserAvatar } from "./helper";

function buildUserTooltipItem(user:Partial<User>, rolesMap:Record<number, Partial<Role>>|null=null) {
    const itemDiv = document.createElement('div')
    itemDiv.classList.add('row')

    const avatar = buildUserAvatar(user)
    
    const tmpRolesContainer = document.createElement('div')
    if (rolesMap) {
        if (user.badge_text) {
            const tag = document.createElement('span')
            tag.classList.add('tag-with-indicator')
            tag.style.width = 'fit-content'
            tag.style.borderRadius = '90px'
            tag.style.cursor = 'pointer'
            
            const text = document.createElement('span')
            text.innerHTML = user.badge_text
            tag.appendChild(text)

            if (user.badge_icon) {
                const icon = document.createElement('i')
                icon.classList.add('ti', `ti-${user.badge_icon}`, 'ms-2')
                icon.style.color = 'rgb(255, 215, 0)'
                tag.appendChild(icon)
            }

            tmpRolesContainer.appendChild(tag)
        } else {
            const userRoles = user.role_ids
                .map(roleId => rolesMap[roleId])
                .filter(role => role !== undefined)
                .sort((a, b) => a.priority - b.priority)
            
                const badge = buildRoleBadge(userRoles[0], null, true)
                tmpRolesContainer.appendChild(badge)
        }
    }

    const colAvatar = document.createElement("div");
    colAvatar.classList.add("col-auto");
    colAvatar.appendChild(avatar);

    const colMain = document.createElement("div");
    colMain.classList.add("col");

    const textTruncate = document.createElement("div");
    textTruncate.classList.add("text-truncate");
    textTruncate.textContent = user.display_name;

    const rolesContainer = document.createElement("div");
    rolesContainer.id = "user-roles-container";
    rolesContainer.classList.add("d-flex", "flex-wrap", "mb-2");
    rolesContainer.innerHTML = tmpRolesContainer.innerHTML; // Since tmpRolesContainer is existing HTML

    colMain.appendChild(textTruncate);
    colMain.appendChild(rolesContainer);

    const colIcon = document.createElement("div");
    colIcon.classList.add("col-auto", "d-flex", "align-items-center");

    const icon = document.createElement("i");
    icon.classList.add("ti", "ti-chevron-right", "text-muted");

    colIcon.appendChild(icon);

    // Append all to itemDiv
    itemDiv.appendChild(colAvatar);
    itemDiv.appendChild(colMain);
    itemDiv.appendChild(colIcon);

    return itemDiv
}

export function buildUserTooltip(user:Partial<User>, rolesMap:Record<number, Partial<Role>>|null=null) {
    const tooltipDiv = document.createElement("div");
    const userItem = buildUserTooltipItem(user, rolesMap)

    // Create the anchor element
    const link = document.createElement("a");
    link.href = `/private/users/${user.id}`;
    link.classList.add("text-decoration-none");

    // Create the card elements
    const card = document.createElement("div");
    card.classList.add("card", "card-sm");

    const cardBody = document.createElement("div");
    cardBody.classList.add("card-body");

    // Append the userItem inside cardBody
    cardBody.appendChild(userItem);

    // Build the structure
    card.appendChild(cardBody);
    link.appendChild(card);
    tooltipDiv.appendChild(link)

    return tooltipDiv
}

export function addTooltipToElement(tooltipElement:HTMLElement, target:HTMLElement, timeout:number=5000, left:number=100) {
    tooltipElement.classList.add("custom-tooltip");

    // Position the tooltip near the target element
    const rect = target.getBoundingClientRect()
    tooltipElement.style.top = `${window.scrollY + rect.top - 30}px`
    tooltipElement.style.left = `${window.scrollX + rect.left + left}px`

    // Add tooltip to the DOM
    document.body.appendChild(tooltipElement)
    hideTooltip(tooltipElement, timeout)
}

export function hideTooltip(tooltipElement:HTMLElement|Element, timeout:number=0) {
    setTimeout(() => {
        if (tooltipElement) {
            tooltipElement.remove()
        }
    }, timeout)
}

export function hideAllTooltips() {
    const tooltips = document.querySelectorAll('.custom-tooltip')

    tooltips.forEach(tt => {
        hideTooltip(tt)
    })
}