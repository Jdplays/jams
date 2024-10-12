import { activateWorkshopFile, archiveWorkshopFile, editWorkshop, getDifficultyLevels, getFilesDataForWorkshop, getIconData, getWorkshop, getWorkshopsField, getWorkshopTypes } from "@global/endpoints";
import { RequestMultiModelJSONData, Workshop, WorkshopType } from "@global/endpoints_interfaces";
import { addSpinnerToElement, animateElement, buildQueryString, buildRadioInputSelectionGroup, createRegexFromList, emptyElement, errorToast, getRadioInputGroupSelection, isDefined, removeSpinnerFromElement, successToast, validateNumberInput, validateTextInput } from "@global/helper";
import { InputValidationPattern, QueryStringData } from "@global/interfaces";
import Dropzone from "dropzone";

let WorkshopId:number
let WorkshopData:Workshop
let workshopTypesMap:Record<number, WorkshopType> = {};
let SelectedWorkshopTypeId:number
let currentWorkshopNames:string[];

let nameInputValid:boolean = false
let descriptionInputValid:boolean = false
let minVolunteersInputValid:boolean = false
let capacityInputValid:boolean = false

let xIconData:string
let editIconData:string

async function prepEditWorkshopForm() {
    const difficultyLevels = await getDifficultyLevels()

    populateWorkshopFiles()
    populateRestoreDropdown()

    const nameInput = document.getElementById('edit-workshop-name') as HTMLInputElement
    const descriptionInput = document.getElementById('edit-workshop-description') as HTMLInputElement
    const minVolunteersInput = document.getElementById('edit-workshop-min_volunteers') as HTMLInputElement
    const capacityInput = document.getElementById('edit-workshop-capacity') as HTMLInputElement

    nameInput.value = WorkshopData.name
    descriptionInput.value = WorkshopData.description
    if (WorkshopData.min_volunteers !== null && WorkshopData.min_volunteers !== undefined) {
        minVolunteersInput.value = String(WorkshopData.min_volunteers)
    }

    if (WorkshopData.capacity !== null && WorkshopData.capacity !== undefined) {
        capacityInput.value = String(WorkshopData.capacity)
    }


    const difficultyLevelSelect = document.getElementById('difficulty-selection-container') as HTMLDivElement
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
        if (difficulty.id === WorkshopData.difficulty_id) {
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
        const checked = true ? workshopType.id === WorkshopData.workshop_type_id : false
        const option = buildRadioInputSelectionGroup(workshopType.name, workshopType.description, String(workshopType.id), 'workshop-type', checked, workshopTypeSelectionGroupOnChange)
        workshopTypeSelect.appendChild(option)
    }

    workshopTypeSelectionGroupOnChange(String(SelectedWorkshopTypeId))
}

async function populateWorkshopFiles() {
    const queryData = {
        active: true
    }
    const queryString = buildQueryString(queryData)
    const workshopFilesResponse = await getFilesDataForWorkshop(WorkshopId, queryString)

    const workshopFilesContainer = document.getElementById('active-files-section') as HTMLDivElement
    emptyElement(workshopFilesContainer)
    if (workshopFilesResponse) {
        let workshopFiles = workshopFilesResponse.data
        if (workshopFiles != null) {
            for (const file of workshopFiles) {
                const fileNameParts = file.name.split('/')
                const fileName = fileNameParts[fileNameParts.length-1]

                let fileBlock = document.createElement('div')
                fileBlock.classList.add('file-block', 'form-control')

                let fileNameSpan = document.createElement('span')
                fileNameSpan.classList.add('file-name')
                fileNameSpan.innerHTML = fileName

                let editButton = document.createElement('a') as HTMLAnchorElement
                editButton.classList.add('btn', 'btn-link', 'link-primary')
                editButton.innerHTML = editIconData
                editButton.href = `/private/management/workshops/${WorkshopId}/files/${file.uuid}/edit`

                let removeButton = document.createElement('a') as HTMLAnchorElement
                removeButton.classList.add('btn', 'btn-link', 'link-danger')
                removeButton.innerHTML = xIconData
                removeButton.onclick = () => {
                    let confirmDeleteModal = $('#confirm-delete')
                    confirmDeleteModal.modal('show')

                    confirmDeleteModal.find('#confirm-delete-text').text(`
                        The file "${fileName}" will be archived. You will be able to restore it via the dropdown or by uploading a new file of the same name (this will be a new version) 
                        `);

                    confirmDeleteModal.find('#confirm-delete-button').off('click');

                    confirmDeleteModal.find('#confirm-delete-button').click(() => {
                        archiveWorkshopFileOnClick(file.uuid, removeButton)
                    });
                }

                fileBlock.appendChild(fileNameSpan)
                fileBlock.appendChild(editButton)
                fileBlock.appendChild(removeButton)

                workshopFilesContainer.appendChild(fileBlock)
            }
           
        }
    }
}

async function populateRestoreDropdown() {
    const queryData = {
        active: false
    }
    const queryString = buildQueryString(queryData)
    const workshopFilesResponse = await getFilesDataForWorkshop(WorkshopId, queryString)

    const filesContainer = document.getElementById('files-container') as HTMLDivElement
    const restoreSection = document.getElementById('restore-section') as HTMLDivElement
    const restoreDropdown = document.getElementById('restore-dropdown') as HTMLSelectElement
    emptyElement(restoreDropdown)

    let defaultFileOption = document.createElement('a') as any
    defaultFileOption.classList.add('dropdown-item')
    defaultFileOption.disabled = true

    restoreDropdown.appendChild(defaultFileOption)


    if (workshopFilesResponse) {
        let archivedFiles = workshopFilesResponse.data
        if (archivedFiles.length <= 0) {
            filesContainer.className = 'files-container'
            restoreSection.style.display = 'none'

        } else {
            filesContainer.className = 'files-container-restore'
            restoreSection.style.display = 'block'
        }
        for (const file of archivedFiles) {
            const fileNameParts = file.name.split('/')
            const fileName = fileNameParts[fileNameParts.length-1]

            let option = document.createElement('a')
            option.classList.add('dropdown-item')
            option.innerHTML = fileName


            option.onclick = function () {
                restoreFileDropdownOnChange(file.uuid)
            }

            restoreDropdown.appendChild(option)
        }
    }
}

async function restoreFileDropdownOnChange(fileUUID:string) {
    activateWorkshopFile(WorkshopId, fileUUID).then(async () => {
        await populateWorkshopFiles()
        await populateRestoreDropdown()
        successToast('File Successfully Restored')
    })
    .catch (() => {
        errorToast()
    })
}

async function archiveWorkshopFileOnClick(fileUUID:string, removeButton:HTMLAnchorElement) {
    addSpinnerToElement(removeButton)
    await archiveWorkshopFile(WorkshopId, fileUUID).then(async () => {
        await populateWorkshopFiles()
        await populateRestoreDropdown()
        successToast('File Successfully Archived')
    })
    .catch(() => {
        errorToast()
    })

    removeSpinnerFromElement(removeButton)
}

function editWorkshopOnClick() {
    const editButton = document.getElementById('edit-workshop-button') as HTMLButtonElement

    const workshopNameInput = document.getElementById('edit-workshop-name') as HTMLInputElement
    const workshopDescriptionInput = document.getElementById('edit-workshop-description') as HTMLInputElement
    const workshopMinVolunteersInput = document.getElementById('edit-workshop-min_volunteers') as HTMLInputElement
    const workshopCapacityInput = document.getElementById('edit-workshop-capacity') as HTMLInputElement
    const workshopDifficultySelect = document.getElementById('difficulty-selection-container') as HTMLInputElement
    const workshopTypeSelect = document.getElementById('workshop-type-selection-container') as HTMLDivElement

    workshopNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    workshopDescriptionInput.dispatchEvent(new Event('input', { bubbles: true }))
    workshopMinVolunteersInput.dispatchEvent(new Event('input', { bubbles: true }))
    workshopCapacityInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (!nameInputValid || !descriptionInputValid || !minVolunteersInputValid || !capacityInputValid) {
        animateElement(editButton, 'element-shake')
        return
    }

    const workshopTypeId = getRadioInputGroupSelection(workshopTypeSelect, 'workshop-type')
    const difficultyIdStr = getRadioInputGroupSelection(workshopDifficultySelect, 'difficulty-level')

    let difficultyId = null
    if (difficultyIdStr !== null) {
        difficultyId = Number(difficultyIdStr)
    }

    const data:Partial<RequestMultiModelJSONData> = {
        name: workshopNameInput.value,
        description: workshopDescriptionInput.value,
        difficulty_id: Number(difficultyId),
        min_volunteers: Number(workshopMinVolunteersInput.value),
        capacity: Number(workshopCapacityInput.value),
        workshop_type_id: Number(workshopTypeId)
    }

    editWorkshop(WorkshopId, data).then((response) => {
        successToast(response.message)
        window.location.replace('/private/management/workshops')
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
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
    
    SelectedWorkshopTypeId = currentWorkshopType.id
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

function initialiseDropzone() {
    const dropzoneElement = document.getElementById('workshop-files-dropzone')

    const dropzone = new Dropzone('form#workshop-files-dropzone', {url: `/api/v1/workshops/${WorkshopId}/files`, parallelUploads: 1})

    dropzone.on("complete", async function(file) {
        await populateWorkshopFiles()
        await populateRestoreDropdown()
        dropzone.removeFile(file);
      });
}

async function loadIcons() {
    xIconData = await getIconData('x')
    editIconData = await getIconData('edit')
}

// EVent Listeners
document.addEventListener("DOMContentLoaded", async () => {
    const pagePath = window.location.pathname
    const pathParts = pagePath.split('/')
    WorkshopId = Number(pathParts[pathParts.length - 2])
    WorkshopData = await getWorkshop(WorkshopId)
    SelectedWorkshopTypeId = WorkshopData.workshop_type_id
    workshopTypesMap = await preLoadWorkshopTypes()
    await loadIcons()
    initialiseDropzone()

    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }
    const queryString = buildQueryString(queryData)

    getWorkshopsField('name', queryString).then((response) => {
        const currentWorkshops = response.data
        if (currentWorkshops !== undefined) {
            currentWorkshopNames = currentWorkshops.map(ws => ws.name)
        }
    })

    prepEditWorkshopForm()
});

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // Name
    const workshopNameInput = document.getElementById('edit-workshop-name') as HTMLInputElement
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
    const workshoDescriptionInput = document.getElementById('edit-workshop-description') as HTMLInputElement
    workshoDescriptionInput.oninput = async () => {
        descriptionInputValid = validateTextInput(workshoDescriptionInput, null, true)
    }

    // Min Volunteers
    const workshopMinVolunteersInput = document.getElementById('edit-workshop-min_volunteers') as HTMLInputElement
    workshopMinVolunteersInput.oninput = () => {
        minVolunteersInputValid = validateNumberInput(workshopMinVolunteersInput)
    }

    // Capacity
    const workshopCapacityInput = document.getElementById('edit-workshop-capacity') as HTMLInputElement
    workshopCapacityInput.oninput = () => {
        capacityInputValid = validateNumberInput(workshopCapacityInput)
    }
})

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).editWorkshopOnClick = editWorkshopOnClick;
    }
});