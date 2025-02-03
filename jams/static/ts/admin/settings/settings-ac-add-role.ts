import { addNewRole, getPageNames, getRoleNames } from "@global/endpoints";
import { animateElement, buildQueryString, createRegexFromList, emptyElement, errorToast, isDefined, isNullEmptyOrSpaces, successToast, validateNumberInput, validateTextInput } from "@global/helper";
import { InputValidationPattern, QueryStringData } from "@global/interfaces";
import { generatePageCheckboxs, getSelectedPageIds } from "./settings-helper";
import { RequestMultiModelJSONData } from "@global/endpoints_interfaces";

let currentRoleNames:string[];

let nameInputValid:boolean = false
let descriptionInputValid:boolean = false
let colourInputValid:boolean = false
let priorityInputValid:boolean = false

function increasePriorityValueOnClick() {
    const priorityInput = document.getElementById('add-role-priority') as HTMLInputElement

    if (Number(priorityInput.value) >= 100) {
        return
    }

    priorityInput.value = String((Number(priorityInput.value) + 1))
    priorityInput.dispatchEvent(new Event('input', { bubbles: true }))
}

function decreasePriorityValueOnClick() {
    const priorityInput = document.getElementById('add-role-priority') as HTMLInputElement

    if (Number(priorityInput.value) <= 1) {
        return
    }

    priorityInput.value = String((Number(priorityInput.value) - 1))
    priorityInput.dispatchEvent(new Event('input', { bubbles: true }))
}

async function prepAddRoleForm() {
    const loadingElement = document.getElementById('loading') as HTMLElement
    const addRoleBlock = document.getElementById('add-role-block') as HTMLElement
    const addButton = document.getElementById('add-role-button') as HTMLButtonElement

    const roleAssignmentsBlock = document.getElementById('role-assignments')
    const pagesContainer = roleAssignmentsBlock.querySelector('#pages-container') as HTMLElement
    
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

    loadingElement.style.display = 'none'
    addRoleBlock.style.display = 'block'
    addButton.disabled = false
}

async function addRoleOnClick() {
    const addButton = document.getElementById('add-role-button') as HTMLButtonElement

    const roleAssignmentsBlock = document.getElementById('role-assignments')
    const pageCountError = roleAssignmentsBlock.querySelector('#page-count-error') as HTMLElement
    pageCountError.style.display = 'none'

    const nameInput = document.getElementById('add-role-name') as HTMLInputElement
    const descriptionInput = document.getElementById('add-role-description') as HTMLInputElement
    const colourInput = document.getElementById('add-role-colour') as HTMLInputElement
    const priorityInput = document.getElementById('add-role-priority') as HTMLInputElement
    const hiddenInput = document.getElementById('add-role-hidden') as HTMLInputElement
    const selectedPageIds = getSelectedPageIds((roleAssignmentsBlock))

    nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    descriptionInput.dispatchEvent(new Event('input', { bubbles: true }))
    colourInput.dispatchEvent(new Event('input', { bubbles: true }))
    priorityInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (selectedPageIds.length === 0) {
        pageCountError.style.display = 'block'
        animateElement(addButton, 'element-shake')
        return
    }

    if (!nameInputValid || !descriptionInputValid || !colourInputValid || !priorityInputValid) {
        animateElement(addButton, 'element-shake')
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

    const response = await addNewRole(data)
    if (response) {
        successToast('Event Successfully Added')
        window.location.replace('/private/admin/settings/roles')
    }
    else {
        errorToast()
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    getRoleNames().then((response) => {
        const currentRoles = response.data
        if (currentRoles !== undefined) {
            currentRoleNames = currentRoles.map(role => role.name)
        }
    })

    prepAddRoleForm()
});

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // Name
    const roleNameInput = document.getElementById('add-role-name') as HTMLInputElement
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
    const roleDescriptionInput = document.getElementById('add-role-description') as HTMLInputElement
    roleDescriptionInput.oninput = async () => {
        descriptionInputValid = validateTextInput(roleDescriptionInput, null, true)
    }

    // Display Colour
    const roleColourInput = document.getElementById('add-role-colour') as HTMLInputElement
    roleColourInput.oninput = () => {
        let patterns:InputValidationPattern[] = [
            {pattern: new RegExp('^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'), errorMessage: 'Invalid Hex value', match:true}
        ]

        colourInputValid = validateTextInput(roleColourInput, patterns)
    }

    // Priority
    const rolePriorityInput = document.getElementById('add-role-priority') as HTMLInputElement
    rolePriorityInput.oninput = () => {
        priorityInputValid = validateNumberInput(rolePriorityInput, false, 1, 100)
    }
})

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).increasePriorityValueOnClick = increasePriorityValueOnClick;
        (<any>window).decreasePriorityValueOnClick = decreasePriorityValueOnClick;
        (<any>window).addRoleOnClick = addRoleOnClick;
    }
});