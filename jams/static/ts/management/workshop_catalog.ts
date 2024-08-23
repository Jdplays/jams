import {
    activateWorkshop,
    addWorkshop,
    archiveWorkshop,
    editWorkshop,
    getDifficultyLevel,
    getDifficultyLevels,
    getFilesForWorkshop,
    getWorkshop,
    getWorkshopFiles,
    getWorkshops,
    uploadFileToWorkshop
} from "../global/endpoints";
import { RequestMultiModelJSONData, File, Workshop, QueryStringData } from "../global/endpoints_interfaces";
import { buildActionButtonsForModel, successToast, errorToast, buildQueryString } from "../global/helper";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let gridApi: GridApi<any>;

let difficultyLevelsNameMap:Record<number, string> = {};
let workshopWorksheetsMap:Record<number, File> = {};

async function archiveWorkshopOnClick(workshopId:number) {
    const response = await archiveWorkshop(workshopId)
    if (response) {
        successToast('Workshop Successfully Archived')
        populateWorkshopsTable()
    }
    else {
        errorToast()
    }
}

async function activateWorkshopOnClick(workshopId:number) {
    const response = await activateWorkshop(workshopId)
    if (response) {
        successToast('Workshop Successfully Activated')
        populateWorkshopsTable()
    }
    else {
        errorToast()
    }
}

function addWorkshopOnClick() {
    const worksheet = (document.getElementById('add-workshop-worksheet') as HTMLInputElement).files[0]
    const data:Partial<RequestMultiModelJSONData> = {
        'name': (document.getElementById('add-workshop-name') as HTMLInputElement).value,
        'description': (document.getElementById('add-workshop-description') as HTMLInputElement).value,
        'min_volunteers': Number((document.getElementById('add-workshop-min_volunteers') as HTMLInputElement).value),
        'difficulty_id': Number((document.getElementById('add-workshop-difficulty') as HTMLInputElement).value)
    }

    addWorkshop(data).then(async (response) => {
        const workshopId = response.id
        if (worksheet != null) {
            const originalExtension = worksheet.name.split('.').pop();
            // Define the new name for the file
            const newFileName = `worksheet.${originalExtension}`;
            const newFile = new File([worksheet], newFileName, { type: worksheet.type })
            var fileData = new FormData();
            fileData.append('file', newFile);
            await uploadFileToWorkshop(workshopId, fileData)
        }

        successToast('Workshop Successfully Added')
        populateWorkshopsTable()
    }).catch(error => {
        errorToast()
    })
}

function editWorkshopOnClick() {
    const workshopId = Number((document.getElementById('edit-workshop-id') as HTMLInputElement).value)
    const worksheet = (document.getElementById('edit-workshop-worksheet') as HTMLInputElement).files[0]

    const data:Partial<RequestMultiModelJSONData> = {
        'name': (document.getElementById('edit-workshop-name') as HTMLInputElement).value,
        'description': (document.getElementById('edit-workshop-description') as HTMLInputElement).value,
        'min_volunteers': Number((document.getElementById('edit-workshop-min_volunteers') as HTMLInputElement).value),
        'difficulty_id': Number((document.getElementById('edit-workshop-difficulty') as HTMLInputElement).value)
    }

    editWorkshop(workshopId, data).then(async (response) => {
        if (worksheet != null) {
            const originalExtension = worksheet.name.split('.').pop();
            // Define the new name for the file
            const newFileName = `worksheet.${originalExtension}`;
            const newFile = new File([worksheet], newFileName, { type: worksheet.type })
            var fileData = new FormData();
            fileData.append('file', newFile);
            await uploadFileToWorkshop(workshopId, fileData)
        }

        successToast('Workshop Successfully Edited')
        populateWorkshopsTable()
    }).catch(error => {
        errorToast()
    })
}

function clearDropDown(select:HTMLSelectElement) {
    while(select.firstChild) {
        select.removeChild(select.firstChild)
    }
}

async function prepAddWorkshopForm() {
    let difficultyLevels = await getDifficultyLevels()

    const difficultyLevelDropdown = document.getElementById('add-workshop-difficulty') as HTMLSelectElement
    clearDropDown(difficultyLevelDropdown)

    const defaultOptionsElement = document.createElement('option');
    defaultOptionsElement.text = "Select Difficulty"
    defaultOptionsElement.value = '-1'
    defaultOptionsElement.disabled = true;
    defaultOptionsElement.selected = true;
    defaultOptionsElement.hidden = true;
    difficultyLevelDropdown.appendChild(defaultOptionsElement)

    for (const difficulty of difficultyLevels.data) {
        const option = document.createElement('option');
        option.innerText = difficulty.name;
        option.value = String(difficulty.id)

        const badge = document.createElement('span');
        badge.classList.add('badge-circle', 'ms-auto');
        badge.style.backgroundColor = difficulty.display_colour;

        difficultyLevelDropdown.appendChild(option);
    }
}


async function prepEditWorkshopForm(workshopId:number) {
    let workshop = await getWorkshop(workshopId)
    let workshopDifficulty = null
    if (workshop.difficulty_id != null) {
         workshopDifficulty = await getDifficultyLevel(workshop.difficulty_id)
    }
    let difficultyLevels = await getDifficultyLevels()

    const workshopFilesResponse = await getFilesForWorkshop(workshop.id)


    const hiddenIdInput = document.getElementById('edit-workshop-id') as HTMLInputElement
    const nameInput = document.getElementById('edit-workshop-name') as HTMLInputElement
    const descriptionInput = document.getElementById('edit-workshop-description') as HTMLInputElement
    const minVolunteersInput = document.getElementById('edit-workshop-min_volunteers') as HTMLInputElement

    hiddenIdInput.value = String(workshopId)
    nameInput.value = workshop.name
    descriptionInput.value = workshop.description
    minVolunteersInput.value = String(workshop.min_volunteers)

    if (workshopFilesResponse) {
        let workshopFiles = workshopFilesResponse.data
        if (workshopFiles != null) {
            let filesText = ''
            for (const file of workshopFiles) {
                filesText += `${file.name} `
            }
            document.getElementById('edit-workshop-current-file').innerHTML = `Current File: ${filesText}`
        }
    }
    else {
        document.getElementById('edit-workshop-current-file').innerHTML = ``
    }

    const difficultyLevelDropdown = document.getElementById('edit-workshop-difficulty') as HTMLSelectElement
    clearDropDown(difficultyLevelDropdown)

    const defaultOptionsElement = document.createElement('option');
    if (await workshopDifficulty == null) {
        defaultOptionsElement.text = "Select Difficulty"
        defaultOptionsElement.value = '-1'
    }
    else {
        defaultOptionsElement.innerText = workshopDifficulty.name
        defaultOptionsElement.value = String(workshopDifficulty.id)
    }
    defaultOptionsElement.disabled = true;
    defaultOptionsElement.selected = true;
    defaultOptionsElement.hidden = true;
    difficultyLevelDropdown.appendChild(defaultOptionsElement)

    for (const difficulty of difficultyLevels.data) {
        const option = document.createElement('option');
        option.innerText = difficulty.name;
        option.value = String(difficulty.id)

        const badge = document.createElement('span');
        badge.classList.add('badge-circle', 'ms-auto');
        badge.style.backgroundColor = difficulty.display_colour;

        //dropdownItem.appendChild(badge);
        difficultyLevelDropdown.appendChild(option);
    }

}

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        columnDefs: [
            {field: 'name', flex: 1},
            {field: 'description', flex: 1},
            {field: 'min_volunteers', flex: 1},
            {
                field: 'difficulty', cellRenderer: (params:any) => {
                    if (!params.data.difficulty_id) {
                        return 'None'
                    } else {
                        return difficultyLevelsNameMap[params.data.difficulty_id]
                    }
                },
                flex: 1
            },
            {
                field: 'worksheet', cellRenderer: (params:any) => {
                    if (!params.data.has_files) {
                        return 'None'
                    } else {
                        const worksheetData = workshopWorksheetsMap[params.data.id]
                        let worksheetElement = document.createElement('a')
                        worksheetElement.innerHTML = worksheetData.name
                        worksheetElement.href = `/private/management/workshops/${params.data.id}/files/${worksheetData.uuid}`
                        worksheetElement.style.padding = '5px'

                        return worksheetElement
                    }
                },
                flex: 1
            },
            {
                field: 'options', cellRenderer: (params:any) => {
                    return buildActionButtonsForModel(params.data.id, params.data.active, archiveWorkshopOnClick, activateWorkshopOnClick, 'edit-workshop-modal', prepEditWorkshopForm)
                },
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('workshops-data-grid') as HTMLElement
    gridApi = createGrid(gridElement, gridOptions)

    populateWorkshopsTable()
}

async function preLoadDifficultyLevels() {
    const response = await getDifficultyLevels()
    let difficultyLevels = response.data
    let difficultyLevelsNameMap:Record<number, string> = {}
    difficultyLevels.forEach(difficultyLevel => {
        difficultyLevelsNameMap[difficultyLevel.id] = difficultyLevel.name
    })
    return difficultyLevelsNameMap
}

async function preLoadWorkshopWorksheets(workshops:[Workshop]) {
    let workshopIdsWithFiles:number[] = workshops.filter(workshop => workshop.has_files).map(ws => ws.id)
    let workshopWorksheetsMap:Record<number, File> = {}

    const promises = workshopIdsWithFiles.map(async (wId) => {
        const queryData: Partial<QueryStringData> = {
            workshop_id: wId,
            type: 'worksheet'
        };
        const queryString = buildQueryString(queryData);
        const workshopFilesResponse = await getWorkshopFiles(queryString);
        
        workshopWorksheetsMap[wId] = workshopFilesResponse.data[0];
    });

    await Promise.all(promises);

    return workshopWorksheetsMap;

}


async function populateWorkshopsTable() {
    const allWorkshopsResponse = await getWorkshops();
    let allWorkshops = allWorkshopsResponse.data

    difficultyLevelsNameMap = await preLoadDifficultyLevels()
    workshopWorksheetsMap = await preLoadWorkshopWorksheets(allWorkshops)

    gridApi.setGridOption('rowData', allWorkshops)
}

function initaliseAddForm() {
    const button = document.getElementById('open-add-workshop-modal-button')
    button.onclick = function() {
        prepAddWorkshopForm()
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", initialiseAgGrid);
document.addEventListener("DOMContentLoaded", initaliseAddForm);
document.addEventListener("DOMContentLoaded", () => {
    if (typeof window !== 'undefined') {
        (<any>window).addWorkshopOnClick = addWorkshopOnClick;
        (<any>window).editWorkshopOnClick = editWorkshopOnClick;
    }
});
  