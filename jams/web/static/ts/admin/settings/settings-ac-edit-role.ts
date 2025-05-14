import { editRole, getPageNames, getRole, getRoleNames } from "@global/endpoints";
import { animateElement, buildQueryString, createRegexFromList, emptyElement, errorToast, isDefined, isNullEmptyOrSpaces, successToast, validateNumberInput, validateTextInput } from "@global/helper";
import { InputValidationPattern, QueryStringData } from "@global/interfaces";
import { checkPageInputsFromIds, generatePageCheckboxs, getSelectedPageIds } from "./settings-helper";
import { RequestMultiModelJSONData, Role } from "@global/endpoints_interfaces";

let roleId:number;
let roleData:Role;
let currentRoleNames:string[];

let nameInputValid:boolean = false
let descriptionInputValid:boolean = false
let colourInputValid:boolean = false
let priorityInputValid:boolean = false

function increasePriorityValueOnClick() {
    const priorityInput = document.getElementById('edit-role-priority') as HTMLInputElement

    if (Number(priorityInput.value) >= 100) {
        return
    }

    priorityInput.value = String((Number(priorityInput.value) + 1))
    priorityInput.dispatchEvent(new Event('input', { bubbles: true }))
}

function decreasePriorityValueOnClick() {
    const priorityInput = document.getElementById('edit-role-priority') as HTMLInputElement

    if (Number(priorityInput.value) <= 1) {
        return
    }

    priorityInput.value = String((Number(priorityInput.value) - 1))
    priorityInput.dispatchEvent(new Event('input', { bubbles: true }))
}

async function prepEditRoleForm() {
    const loadingElement = document.getElementById('loading') as HTMLElement
    const addRoleBlock = document.getElementById('edit-role-block') as HTMLElement
    const editButton = document.getElementById('edit-role-button') as HTMLButtonElement

    const roleAssignmentsBlock = document.getElementById('role-assignments')
    const pagesContainer = roleAssignmentsBlock.querySelector('#pages-container') as HTMLElement

    const nameInput = document.getElementById('edit-role-name') as HTMLInputElement
    const descriptionInput = document.getElementById('edit-role-description') as HTMLInputElement
    const colourInput = document.getElementById('edit-role-colour') as HTMLInputElement
    const priorityInput = document.getElementById('edit-role-priority') as HTMLInputElement
    const hiddenInput = document.getElementById('edit-role-hidden') as HTMLInputElement

    nameInput.value = roleData.name
    descriptionInput.value = roleData.description
    colourInput.value = roleData.display_colour
    priorityInput.value = String(roleData.priority)
    hiddenInput.checked = roleData.hidden

    const queryData:Partial<QueryStringData> = {
        parent_id:null,
        default: false,
        public:false
    }
    const queryString = buildQueryString(queryData)
    const response = await getPageNames(queryString);
    let pages = response.data

    const container = generatePageCheckboxs(pages)
    emptyElement(pagesContainer)
    pagesContainer.appendChild(container)
    checkPageInputsFromIds(pagesContainer, roleData.page_ids)

    loadingElement.style.display = 'none'
    addRoleBlock.style.display = 'block'
    editButton.disabled = false
}

async function editRoleOnClick() {
    const editButton = document.getElementById('edit-role-button') as HTMLButtonElement

    const roleAssignmentsBlock = document.getElementById('role-assignments')
    const pageCountError = roleAssignmentsBlock.querySelector('#page-count-error') as HTMLElement
    pageCountError.style.display = 'none'

    const nameInput = document.getElementById('edit-role-name') as HTMLInputElement
    const descriptionInput = document.getElementById('edit-role-description') as HTMLInputElement
    const colourInput = document.getElementById('edit-role-colour') as HTMLInputElement
    const priorityInput = document.getElementById('edit-role-priority') as HTMLInputElement
    const hiddenInput = document.getElementById('edit-role-hidden') as HTMLInputElement
    const selectedPageIds = getSelectedPageIds((roleAssignmentsBlock))

    nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    descriptionInput.dispatchEvent(new Event('input', { bubbles: true }))
    colourInput.dispatchEvent(new Event('input', { bubbles: true }))
    priorityInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (selectedPageIds.length === 0) {
        pageCountError.style.display = 'block'
        animateElement(editButton, 'element-shake')
        return
    }

    if (!nameInputValid || !descriptionInputValid || !colourInputValid || !priorityInputValid) {
        animateElement(editButton, 'element-shake')
        return
    }

    const data:Partial<RequestMultiModelJSONData> = {
        name: nameInput.value,
        description: descriptionInput.value,
        display_colour: colourInput.value,
        priority: Number(priorityInput.value),
        hidden: hiddenInput.checked,
        page_ids: selectedPageIds,
    }

    const response = await editRole(roleId, data)
    if (response) {
        successToast('Event Successfully edited')
        window.location.replace('/private/admin/settings/roles')
    }
    else {
        errorToast()
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
    const roleDataElement = document.getElementById('role-data')
    roleId = Number(roleDataElement.getAttribute('data-role-id'))

    roleData = await getRole(roleId)

    getRoleNames().then((response) => {
        const currentRoles = response.data
        if (currentRoles !== undefined) {
            currentRoleNames = currentRoles.map(role => role.name).filter(name => name !== roleData.name)
        }
    })

    prepEditRoleForm()
});

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // Name
    const roleNameInput = document.getElementById('edit-role-name') as HTMLInputElement
    roleNameInput.oninput = async () => {
        let patterns:InputValidationPattern[] = null
        if (!isNullEmptyOrSpaces(currentRoleNames)) {
            patterns = [
            {pattern: createRegexFromList(currentRoleNames), errorMessage: 'Already exists'}
        ]
    }
        nameInputValid = validateTextInput(roleNameInput, patterns)
    }

    // Description
    const roleDescriptionInput = document.getElementById('edit-role-description') as HTMLInputElement
    roleDescriptionInput.oninput = async () => {
        descriptionInputValid = validateTextInput(roleDescriptionInput, null, true)
    }

    // Display Colour
    const roleColourInput = document.getElementById('edit-role-colour') as HTMLInputElement
    roleColourInput.oninput = () => {
        let patterns:InputValidationPattern[] = [
            {pattern: new RegExp('^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'), errorMessage: 'Invalid Hex value', match:true}
        ]

        colourInputValid = validateTextInput(roleColourInput, patterns)
    }

    // Priority
    const rolePriorityInput = document.getElementById('edit-role-priority') as HTMLInputElement
    rolePriorityInput.oninput = () => {
        priorityInputValid = validateNumberInput(rolePriorityInput, false, 1, 100)
    }
})

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).increasePriorityValueOnClick = increasePriorityValueOnClick;
        (<any>window).decreasePriorityValueOnClick = decreasePriorityValueOnClick;
        (<any>window).editRoleOnClick = editRoleOnClick;
    }
});