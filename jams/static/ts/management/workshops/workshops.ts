import {
    activateWorkshop,
    archiveWorkshop,
    getDifficultyLevels,
    getWorkshopFilesData,
    getWorkshops,
    getWorkshopTypes,
} from "@global/endpoints";
import { DifficultyLevel, WorkshopType } from "@global/endpoints_interfaces";
import { successToast, errorToast, buildArchiveActivateButtonForModel, isNullEmptyOrSpaces, buildQueryString, isDefined } from "@global/helper";
import { QueryStringData } from "@global/interfaces";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let gridApi: GridApi<any>;

let difficultyLevelsMap:Record<number, DifficultyLevel> = {};
let workshopTypesMap:Record<number, WorkshopType> = {};

function applyQuickFilter() {
    gridApi.purgeInfiniteCache()
    populateWorkshopsTable()
}

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
        autoSizeStrategy: {
            type: 'fitGridWidth'
        },
        getRowStyle: (params:any) => {
            if (!params.data) {
                return {color: 'gray', fontStyle: 'italic', textAlign: 'center'}
            }
            return null
        },
        columnDefs: [
            {
                field: 'name',
                cellRenderer: (params:any) => {
                    if (!params.data) {
                      return 'Loading...'
                    }

                    return params.value
                },
                // Span this "Loading..." message across all columns when data is missing
                colSpan: (params) => (!params.data ? 7 : 1),
                flex: 1,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                pinned: true,
                minWidth: 200,
            },
            {
                field: 'description',
                cellRenderer: (params:any) => {
                    return params.value
                },
                tooltipValueGetter: (params:any) => {
                    return params.value
                },
                flex: 1, minWidth: 200
            },
            {
                field: 'workshop_type_id',
                headerName: 'Workshop Type',
                cellRenderer: (params:any) => {
                    if (!params.value) {
                        return 'None'
                    } else {
                        return workshopTypesMap[params.value].name
                    }
                },
                tooltipValueGetter: (params:any) => {
                    if (!params.value) {
                        return ''
                    } else {
                        return workshopTypesMap[params.value].description
                    }
                },
                flex: 1, minWidth: 200
            },
            {
                field: 'min_volunteers',
                cellRenderer: (params:any) => {
                    if (!params.data) {
                        return 'Loading...';
                    }

                    if (!params.data.volunteer_signup) {
                        return 'N/A'
                    }
                    return params.value
                },
                flex: 1, minWidth: 100
            },
            {
                field: 'capacity',
                cellRenderer: (params:any) => {
                    if (!params.data) {
                        return 'Loading...';
                    }

                    if (!params.data.attendee_registration) {
                        return 'N/A'
                    }
                    return params.value
                },
                flex: 1, minWidth: 100
            },
            {
                field: 'difficulty_id',
                headerName: 'Difficulty',
                cellRenderer: (params:any) => {
                    if (!params.value) {
                        return 'N/A'
                    } else {
                        const difficultyLevel = difficultyLevelsMap[params.value]
                        let span1 = document.createElement('span')
                        span1.innerHTML = difficultyLevel.name + ' '

                        let span2 = document.createElement('span')
                        span2.classList.add('badge', 'ms-auto')
                        span2.style.backgroundColor = difficultyLevel.display_colour

                        span1.appendChild(span2)
                        return span1
                    }
                },
                flex: 1, minWidth: 150
            },
            {
                field: 'options',
                cellRenderer: (params:any) => {
                    if (!params.data) {
                        return 'Loading...';
                    }

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
                flex: 1, minWidth: 150
            }
        ],
        rowModelType: 'infinite',
        cacheBlockSize: 50
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
    const workshopsDataSource = {
        rowCount: 0,
        getRows: async function (params:any) {
            const quickFilter = document.getElementById('quick-filter') as HTMLInputElement

            const { startRow, endRow } = params
            const blockSize = endRow - startRow

            let queryData:Partial<QueryStringData> = {
                $pagination_block_size: blockSize,
                $pagination_start_index: startRow,
            }

            if (quickFilter && !isNullEmptyOrSpaces(quickFilter.value)) {
                queryData.name = quickFilter.value
                queryData.description = '$~name'
            }

            gridApi.setGridOption('loading', true)
            let queryString = buildQueryString(queryData)
            let response = await getWorkshops(queryString)

            let allWorkshops = response.data
            let totalRecords = response.pagination.pagination_total_records

            let lastRow = totalRecords <= endRow ? totalRecords : -1

            params.successCallback(allWorkshops, lastRow)
            gridApi.setGridOption('loading', false)
        }
    }

    gridApi.setGridOption("datasource", workshopsDataSource);
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
    difficultyLevelsMap = await preLoadDifficultyLevels()
    workshopTypesMap = await preLoadWorkshopTypes()

    initialiseAgGrid()
});
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).applyQuickFilter = applyQuickFilter;
    }
});
  