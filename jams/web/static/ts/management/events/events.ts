import {
    getEvents,
    getEvent,
    addNewEvent,
    editEvent,
    archiveEvent,
    activateEvent,
    regenerateEventTasks,
    syncEventbriteEvent
} from "@global/endpoints"
import { RequestMultiModelJSONData, Event } from "@global/endpoints_interfaces";
import { buildActionButtonsForModel, successToast, errorToast, isDefined, buildArchiveActivateButtonForModel, formatDateToShort, isNullEmptyOrSpaces, buildQueryString } from "@global/helper";
import { QueryStringData } from "@global/interfaces";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';


let gridApi: GridApi<any>;

function applyQuickFilter() {
    gridApi.purgeInfiniteCache()
    populateEventsTable()
}

async function archiveEventOnClick(eventId:number) {
    const response = await archiveEvent(eventId)
    if (response) {
        successToast('Event Successfully Archived')
        populateEventsTable()
    }
    else {
        errorToast()
    }
}

async function activateEventOnClick(eventId:number) {
    const response = await activateEvent(eventId)
    if (response) {
        successToast('Event Successfully Activated')
        populateEventsTable()
    }
    else {
        errorToast()
    }
}

async function editExternalEventOnClick() {
    const eventID:number = Number((document.getElementById('edit-external-event-id') as HTMLInputElement).value)
    const data:Partial<RequestMultiModelJSONData> = {
        'password': (document.getElementById('edit-external-event-password') as HTMLInputElement).value || '',
    }

    const response = await editEvent(eventID, data)
    if (response) {
        successToast('Event Successfully Edited')
        populateEventsTable()
    }
    else {
        errorToast()
    }
}

async function unlinkExternalEventOnClick() {
    const eventID:number = Number((document.getElementById('edit-external-event-id') as HTMLInputElement).value)
    const data:Partial<RequestMultiModelJSONData> = {
        'external': false
    }

    const response = await editEvent(eventID, data)
    if (response) {
        successToast('Event Successfully Edited')
        populateEventsTable()
    }
    else {
        errorToast()
    }
}

async function prepEditEventForm(eventId:number) {
    const event:Event = await getEvent(eventId)

    const hiddenIdInput = document.getElementById('edit-external-event-id') as HTMLInputElement
    const passwordInput = document.getElementById('edit-external-event-password') as HTMLInputElement

    hiddenIdInput.value = String(eventId)
    passwordInput.value = event.password
}

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        autoSizeStrategy: {
            type: 'fitGridWidth'
        },
        tooltipShowDelay:100,
        tooltipInteraction: true,
        getRowStyle: (params:any) => {
            if (!params.data) {
                return {color: 'gray', fontStyle: 'italic', textAlign: 'center'}
            }
            return null
        },
        suppressMovableColumns: true,
        columnDefs: [
            {
                field: 'filtered_name',
                headerName: 'Name',
                cellRenderer: (params:any) => {
                    if (!params.data) {
                      return 'Loading...'
                    }

                    return params.value
                },
                // Span this "Loading..." message across all columns when data is missing
                colSpan: (params) => (!params.data ? 9 : 1),
                flex: 1,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                pinned: true,
                minWidth: 150,
            },
            {
                field: 'description',
                tooltipValueGetter: (params:any) => {
                    return params.value
                },
                flex: 1, minWidth: 200
            },
            {
                field: 'date',
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value, {includeTime:false})
                    return fDateTime
                },
                flex: 1, minWidth:100},
            {
                field: 'start_date_time',
                headerName: 'Start Time',
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value, {includeDate:false, includeSeconds:false})
                    return fDateTime
                },
                flex: 1, minWidth:100},
            {
                field: 'end_date_time',
                headerName: 'End Time',
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value, {includeDate:false, includeSeconds:false})
                    return fDateTime
                },
                flex: 1, minWidth:100},
            {field: 'capacity', flex: 1, minWidth:100},
            {
                field: 'password',
                tooltipValueGetter: (params:any) => {
                    return params.value
                },
                flex: 1,
                minWidth:100
            },
            {
                field: 'external_url',
                headerName: 'External Link',
                cellRenderer: (params:any) => {
                    let linkElement = document.createElement('a') as HTMLAnchorElement
                    if (params.value) {
                        linkElement.innerHTML = 'Link'
                        linkElement.href = params.data.external_url
                        linkElement.target = '_blank'
                        return linkElement
                    } else {
                        linkElement.innerHTML = 'N/A'
                        return linkElement
                    }
                },
                flex: 1, minWidth:100
            },
            {
                field: 'options', cellRenderer: (params:any) => {
                    if (!params.data) {
                        return 'Loading...';
                    }

                    if (!params.data.external) {
                        let div = document.createElement('div')
                        let editButton = document.createElement('a')
                        editButton.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
                        editButton.style.marginRight = '10px'
                        editButton.innerHTML = 'Edit'
                        editButton.href = `/private/management/events/${params.data.id}/edit`
                        div.appendChild(editButton)

                        const archiveActivateButton = buildArchiveActivateButtonForModel(params.data.id, params.data.active, archiveEventOnClick, activateEventOnClick)
                        div.appendChild(archiveActivateButton)

                        return div
                    }
                    return buildActionButtonsForModel(params.data.id, params.data.active, archiveEventOnClick, activateEventOnClick, 'edit-external-event-modal', prepEditEventForm)
                },
                flex: 1, minWidth:150
            }
        ],
        rowModelType: 'infinite',
        cacheBlockSize: 50
    }

    const gridElement = document.getElementById('events-data-grid') as HTMLElement
    gridElement.style.height = `${window.innerHeight * 0.7}px`;
    gridApi = createGrid(gridElement, gridOptions)

    populateEventsTable()
}

async function populateEventsTable() {
    const eventsDataSource = {
        rowCount: 0,
        getRows: async function (params:any) {
            const quickFilter = document.getElementById('quick-filter') as HTMLInputElement

            const { startRow, endRow } = params
            const blockSize = endRow - startRow

            let queryData:Partial<QueryStringData> = {
                $pagination_block_size: blockSize,
                $pagination_start_index: startRow,
                $order_by: "date",
                $order_direction: "DESC"
            }

            if (!isNullEmptyOrSpaces(quickFilter.value)) {
                queryData.name = quickFilter.value
                queryData.description = '$~name'
            }

            gridApi.setGridOption('loading', true)
            let queryString = buildQueryString(queryData)
            let response = await getEvents(queryString)

            let allEvents = response.data
            let totalRecords = response.pagination.pagination_total_records

            let lastRow = totalRecords <= endRow ? totalRecords : -1

            params.successCallback(allEvents, lastRow)
            gridApi.setGridOption('loading', false)
        }
    }

    gridApi.setGridOption("datasource", eventsDataSource);

}

function regenerateEventTasksOnClick() {
    const eventId:number = Number((document.getElementById('edit-external-event-id') as HTMLInputElement).value)
    regenerateEventTasks(eventId).then((response) => {
        successToast(response.message)
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

function syncEventbriteOnClick() {
    const eventId:number = Number((document.getElementById('edit-external-event-id') as HTMLInputElement).value)
    syncEventbriteEvent(eventId).then((response) => {
        successToast(response.message)
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}


// Event listeners
document.addEventListener("DOMContentLoaded", initialiseAgGrid);
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).editExternalEventOnClick = editExternalEventOnClick;
        (<any>window).unlinkExternalEventOnClick = unlinkExternalEventOnClick;
        (<any>window).applyQuickFilter = applyQuickFilter;
        (<any>window).regenerateEventTasksOnClick = regenerateEventTasksOnClick;
        (<any>window).syncEventbriteOnClick = syncEventbriteOnClick;
    }
});