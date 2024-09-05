import { activateWorkshopFile, archiveWorkshopFile, editWorkshop, getDifficultyLevel, getDifficultyLevels, getFilesDataForWorkshop, getIconData, getWorkshop, getWorkshopTypes, uploadFileToWorkshop } from "@global/endpoints";
import { QueryStringData, RequestMultiModelJSONData, Workshop, WorkshopType } from "@global/endpoints_interfaces";
import { addSpinnerToElement, buildQueryString, buildRadioInputSelectionGroup, emptyElement, errorToast, getRadioInputGroupSelection, isDefined, removeSpinnerFromElement, successToast } from "@global/helper";
import Dropzone from "dropzone";

let WorkshopId:number
let WorkshopData:Workshop
let workshopTypesMap:Record<number, WorkshopType> = {};
let SelectedWorkshopTypeId:number

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
    minVolunteersInput.value = String(WorkshopData.min_volunteers)
    capacityInput.value = String(WorkshopData.capacity)


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
                    archiveWorkshopFileOnClick(file.uuid, removeButton)
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
    const workshopTypeSelect = document.getElementById('workshop-type-selection-container') as HTMLDivElement
    const workshopDifficultySelect = document.getElementById('difficulty-selection-container') as HTMLInputElement
    const worksheet = (document.getElementById('edit-workshop-worksheet') as HTMLInputElement).files[0]

    const workshopTypeId = getRadioInputGroupSelection(workshopTypeSelect, 'workshop-type')
    const difficultyId = getRadioInputGroupSelection(workshopDifficultySelect, 'difficulty-level')

    const data:Partial<RequestMultiModelJSONData> = {
        name: (document.getElementById('edit-workshop-name') as HTMLInputElement).value,
        description: (document.getElementById('edit-workshop-description') as HTMLInputElement).value,
        difficulty_id: Number(difficultyId),
        min_volunteers: Number((document.getElementById('edit-workshop-min_volunteers') as HTMLInputElement).value),
        capacity: Number((document.getElementById('edit-workshop-capacity') as HTMLInputElement).value),
        workshop_type_id: Number(workshopTypeId)
    }

    editWorkshop(WorkshopId, data).then(async () => {
        if (worksheet != null) {
            const originalExtension = worksheet.name.split('.').pop();
            // Define the new name for the file
            const newFileName = `worksheet.${originalExtension}`;
            const newFile = new File([worksheet], newFileName, { type: worksheet.type })
            var fileData = new FormData();
            fileData.append('file', newFile);
            await uploadFileToWorkshop(WorkshopId, fileData)
        }

        successToast('Workshop Successfully Edited')
        window.location.replace('/private/management/workshops')
    }).catch(error => {
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

    const dropzone = new Dropzone('form#workshop-files-dropzone', {url: `/backend/workshops/${WorkshopId}/files`})

    dropzone.on("complete", async function(file) {
        await populateWorkshopFiles()
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
    prepEditWorkshopForm()
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).editWorkshopOnClick = editWorkshopOnClick;
    }
});