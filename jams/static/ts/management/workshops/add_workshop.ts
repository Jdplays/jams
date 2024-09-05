import { addWorkshop, getDifficultyLevels, getWorkshopTypes, uploadFileToWorkshop } from "@global/endpoints"
import { Workshop, WorkshopType } from "@global/endpoints_interfaces"
import { buildRadioInputSelectionGroup, emptyElement, errorToast, getRadioInputGroupSelection, isDefined, successToast } from "@global/helper"

let workshopTypesMap:Record<number, WorkshopType> = {};

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
    const workshopNameInput = document.getElementById('add-workshop-name') as HTMLInputElement
    const workshopDescriptionInput = document.getElementById('add-workshop-description') as HTMLInputElement
    const workshopMinVolunteersInput = document.getElementById('add-workshop-min_volunteers') as HTMLInputElement
    const workshopCapacityInput = document.getElementById('add-workshop-capacity') as HTMLInputElement
    const workshopDifficultySelect = document.getElementById('difficulty-selection-container') as HTMLInputElement
    const workshopTypeSelect = document.getElementById('workshop-type-selection-container') as HTMLDivElement

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
        successToast('Workshop Successfully Added')
        const workshopId = response.id
        window.location.replace(`/private/management/workshops/${workshopId}/edit`)
    }).catch(error => {
        console.log(error)
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
    prepAddWorkshopForm()
})
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).addWorkshopOnClick = addWorkshopOnClick;
    }
});
