import { addWorkshop, getDifficultyLevels, getWorkshopField, getWorkshopsField, getWorkshopTypes, uploadFileToWorkshop } from "@global/endpoints"
import { Workshop, WorkshopType } from "@global/endpoints_interfaces"
import { animateElement, buildQueryString, buildRadioInputSelectionGroup, createRegexFromList, emptyElement, errorToast, getRadioInputGroupSelection, isDefined, successToast, validateNumberInput, validateTextInput } from "@global/helper"
import { InputValidationPattern, QueryStringData } from "@global/interfaces";

let workshopTypesMap:Record<number, WorkshopType> = {};
let currentWorkshopNames:string[];

let nameInputValid:boolean = false
let descriptionInputValid:boolean = false
let minVolunteersInputValid:boolean = false
let capacityInputValid:boolean = false

async function prepAddWorkshopForm() {
    let difficultyLevels = await getDifficultyLevels()

    const difficultyLevelSelect = document.getElementById('difficulty-selection-container') as HTMLSelectElement
    const workshopTypeSelect = document.getElementById('workshop-type-selection-container') as HTMLDivElement

    emptyElement(difficultyLevelSelect)
    emptyElement(workshopTypeSelect)

    for (const difficulty of difficultyLevels.data) {
        let label = document.createElement('label')
        label.classList.add('form-selectgroup-item')

        let input = document.createElement('input') as HTMLInputElement
        input.type = 'radio'
        input.name = 'difficulty-level'
        input.value = String(difficulty.id)
        input.classList.add('form-selectgroup-input')
        if (difficultyLevels.data.indexOf(difficulty) === 0) {
            input.checked = true
        }

        let span1 = document.createElement('span')
        span1.classList.add('form-selectgroup-label')
        span1.innerHTML = difficulty.name + ' '

        let span2 = document.createElement('span')
        span2.classList.add('badge', 'ms-auto')
        span2.style.backgroundColor = difficulty.display_colour

        span1.appendChild(span2)

        label.appendChild(input)
        label.appendChild(span1)

        difficultyLevelSelect.appendChild(label)
    }

    for (const workshopType of Object.values(workshopTypesMap)) {
        let checked = false
        if (workshopType.id === 1) {
            checked = true
        }
        const option = buildRadioInputSelectionGroup(workshopType.name, workshopType.description, String(workshopType.id), 'workshop-type', checked, workshopTypeSelectionGroupOnChange)
        workshopTypeSelect.appendChild(option)
    }
}

function addWorkshopOnClick() {
    const addButton = document.getElementById('add-workshop-button') as HTMLButtonElement

    const workshopNameInput = document.getElementById('add-workshop-name') as HTMLInputElement
    const workshopDescriptionInput = document.getElementById('add-workshop-description') as HTMLInputElement
    const workshopMinVolunteersInput = document.getElementById('add-workshop-min_volunteers') as HTMLInputElement
    const workshopCapacityInput = document.getElementById('add-workshop-capacity') as HTMLInputElement
    const workshopDifficultySelect = document.getElementById('difficulty-selection-container') as HTMLInputElement
    const workshopTypeSelect = document.getElementById('workshop-type-selection-container') as HTMLDivElement

    workshopNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    workshopDescriptionInput.dispatchEvent(new Event('input', { bubbles: true }))
    workshopMinVolunteersInput.dispatchEvent(new Event('input', { bubbles: true }))
    workshopCapacityInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (!nameInputValid || !descriptionInputValid || !minVolunteersInputValid || !capacityInputValid) {
        animateElement(addButton, 'element-shake')
        return
    }

    const workshopTypeId = getRadioInputGroupSelection(workshopTypeSelect, 'workshop-type')
    const difficultyId = getRadioInputGroupSelection(workshopDifficultySelect, 'difficulty-level')


    let data:Partial<Workshop> = {
        name: workshopNameInput.value,
        description: workshopDescriptionInput.value,
        difficulty_id: Number(difficultyId),
        min_volunteers: Number(workshopMinVolunteersInput.value),
        capacity: Number(workshopCapacityInput.value),
        workshop_type_id: Number(workshopTypeId)
    }

    addWorkshop(data).then((response) => {
        successToast(response.message)
        const workshopId = response.data.id
        window.location.replace(`/private/management/workshops/${workshopId}/edit`)
    }).catch(error => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast()
    })
}

function workshopTypeSelectionGroupOnChange(value:string) {
    const minVolunteersBlock = document.getElementById('min-volunteers-block') as HTMLDivElement
    const capacityBlock = document.getElementById('capacity-block') as HTMLDivElement
    const difficultyBlock = document.getElementById('difficulty-block') as HTMLDivElement

    const currentWorkshopType = workshopTypesMap[Number(value)]

    if (currentWorkshopType.volunteer_signup) {
        minVolunteersBlock.style.display = 'block'
    } else {
        minVolunteersBlock.style.display = 'none'
    }

    if (currentWorkshopType.attendee_registration) {
        capacityBlock.style.display = 'block'
        difficultyBlock.style.display = 'block'
    } else {
        capacityBlock.style.display = 'none'
        difficultyBlock.style.display = 'none'
    }
}

async function preLoadWorkshopTypes() {
    const response = await getWorkshopTypes()
    let workshopTypes = response.data
    let workshopTypesMap:Record<number, WorkshopType> = {}
    workshopTypes.forEach(workshopType => {
        workshopTypesMap[workshopType.id] = workshopType
    })
    return workshopTypesMap
}

// EVent Listeners
document.addEventListener("DOMContentLoaded", async () => {
    workshopTypesMap = await preLoadWorkshopTypes()

    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }
    const queryString = buildQueryString(queryData)

    const currentWorkshops = (await getWorkshopsField('name', queryString)).data
    currentWorkshopNames = currentWorkshops.map(ws => ws.name)
    
    prepAddWorkshopForm()
})

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // Name
    const workshopNameInput = document.getElementById('add-workshop-name') as HTMLInputElement
    workshopNameInput.oninput = async () => {
        let patterns:InputValidationPattern[] = null
        if (currentWorkshopNames) {
            patterns = [
            {pattern: createRegexFromList(currentWorkshopNames), errorMessage: 'Already exists'}
        ]
    }
        nameInputValid = validateTextInput(workshopNameInput, patterns)
    }

    // Description
    const workshopDescriptionInput = document.getElementById('add-workshop-description') as HTMLInputElement
    workshopDescriptionInput.oninput = async () => {
        descriptionInputValid = validateTextInput(workshopDescriptionInput, null, true)
    }

    // Min Volunteers
    const workshopMinVolunteersInput = document.getElementById('add-workshop-min_volunteers') as HTMLInputElement
    workshopMinVolunteersInput.oninput = () => {
        minVolunteersInputValid = validateNumberInput(workshopMinVolunteersInput)
    }

    // Capacity
    const workshopCapacityInput = document.getElementById('add-workshop-capacity') as HTMLInputElement
    workshopCapacityInput.oninput = () => {
        capacityInputValid = validateNumberInput(workshopCapacityInput)
    }
})

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).addWorkshopOnClick = addWorkshopOnClick;
    }
});
