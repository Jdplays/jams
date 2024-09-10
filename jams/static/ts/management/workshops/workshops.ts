import {
    activateWorkshop,
    archiveWorkshop,
    getDifficultyLevels,
    getWorkshopFilesData,
    getWorkshops,
    getWorkshopTypes,
} from "@global/endpoints";
import { FileData, Workshop, QueryStringData, DifficultyLevel, WorkshopType } from "@global/endpoints_interfaces";
import { successToast, errorToast, buildQueryString, buildArchiveActivateButtonForModel } from "@global/helper";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let gridApi: GridApi<any>;

let difficultyLevelsMap:Record<number, DifficultyLevel> = {};
let workshopTypesMap:Record<number, WorkshopType> = {};

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

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        tooltipShowDelay:100,
        tooltipMouseTrack: true,
        domLayout: "autoHeight",
        columnDefs: [
            {field: 'name', flex: 1},
            {field: 'description', flex: 1},
            {
                field: 'workshop_type',
                headerName: 'Workshop Type',
                cellRenderer: (params:any) => {
                    if (!params.data.workshop_type_id) {
                        return 'None'
                    } else {
                        return workshopTypesMap[params.data.workshop_type_id].name
                    }
                },
                tooltipValueGetter: (params:any) => {
                    return workshopTypesMap[params.data.workshop_type_id].description
                },
                width: 200,
                flex: 1
            },
            {
                field: 'min_volunteers',
                cellRenderer: (params:any) => {
                    if (!params.data.volunteer_signup) {
                        return 'N/A'
                    }
                    return params.data.min_volunteers
                },
                flex: 1
            },
            {
                field: 'capacity',
                cellRenderer: (params:any) => {
                    if (!params.data.attendee_registration) {
                        return 'N/A'
                    }
                    return params.data.capacity
                },
                flex: 1
            },
            {
                field: 'difficulty', cellRenderer: (params:any) => {
                    if (!params.data.difficulty_id) {
                        return 'N/A'
                    } else {
                        const difficultyLevel = difficultyLevelsMap[params.data.difficulty_id]
                        let span1 = document.createElement('span')
                        span1.innerHTML = difficultyLevel.name + ' '

                        let span2 = document.createElement('span')
                        span2.classList.add('badge', 'ms-auto')
                        span2.style.backgroundColor = difficultyLevel.display_colour

                        span1.appendChild(span2)
                        return span1
                    }
                },
                flex: 1
            },
            {
                field: 'options', cellRenderer: (params:any) => {
                    let div = document.createElement('div')
                    let editButton = document.createElement('a')
                    editButton.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
                    editButton.style.marginRight = '10px'
                    editButton.innerHTML = 'Edit'
                    editButton.href = `/private/management/workshops/${params.data.id}/edit`
                    div.appendChild(editButton)

                    const archiveActivateButton = buildArchiveActivateButtonForModel(params.data.id, params.data.active, archiveWorkshopOnClick, activateWorkshopOnClick)
                    div.appendChild(archiveActivateButton)

                    return div
                },
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('workshops-data-grid') as HTMLElement
    gridElement.style.height = `${window.innerHeight * 0.7}px`;
    gridApi = createGrid(gridElement, gridOptions)

    populateWorkshopsTable()
}

async function preLoadDifficultyLevels() {
    const response = await getDifficultyLevels()
    let difficultyLevels = response.data
    let difficultyLevelsMap:Record<number, DifficultyLevel> = {}
    difficultyLevels.forEach(difficultyLevel => {
        difficultyLevelsMap[difficultyLevel.id] = difficultyLevel
    })
    return difficultyLevelsMap
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

async function populateWorkshopsTable() {
    const allWorkshopsResponse = await getWorkshops();
    let allWorkshops = allWorkshopsResponse.data

    difficultyLevelsMap = await preLoadDifficultyLevels()
    workshopTypesMap = await preLoadWorkshopTypes()

    gridApi.setGridOption('rowData', allWorkshops)
}

// Event listeners
document.addEventListener("DOMContentLoaded", initialiseAgGrid);
  