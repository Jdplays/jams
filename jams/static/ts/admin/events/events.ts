import {
    getEvents,
    getEvent,
    addNewEvent,
    editEvent,
    archiveEvent,
    activateEvent
} from "@global/endpoints"
import { RequestMultiModelJSONData, Event } from "@global/endpoints_interfaces";
import { buildActionButtonsForModel, successToast, errorToast, isDefined, buildArchiveActivateButtonForModel, formatDateToShort } from "@global/helper";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';


let gridApi: GridApi<any>;

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
        columnDefs: [
            {field: 'name', flex: 1},
            {field: 'description', flex: 1},
            {
                field: 'date',
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value, {includeTime:false})
                    return fDateTime
                },
                flex: 1},
            {
                field: 'start_date_time',
                headerName: 'Start Time',
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value, {includeDate:false, includeSeconds:false})
                    return fDateTime
                },
                flex: 1},
            {
                field: 'end_date_time',
                headerName: 'End Time',
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value, {includeDate:false, includeSeconds:false})
                    return fDateTime
                },
                flex: 1},
            {field: 'capacity', flex: 1},
            {field: 'password', flex: 1},
            {
                field: 'external_url',
                headerName: 'External Link',
                cellRenderer: (params:any) => {
                    let linkElement = document.createElement('a') as HTMLAnchorElement
                    if (params.data.external) {
                        linkElement.innerHTML = 'Link'
                        linkElement.href = params.data.external_url
                        linkElement.target = '_blank'
                        return linkElement
                    } else {
                        linkElement.innerHTML = 'N/A'
                        return linkElement
                    }
                },
                flex: 1
            },
            {
                field: 'options', cellRenderer: (params:any) => {
                    if (!params.data.external) {
                        let div = document.createElement('div')
                        let editButton = document.createElement('a')
                        editButton.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
                        editButton.innerHTML = 'Edit'
                        editButton.href = `/private/admin/events/${params.data.id}/edit`
                        div.appendChild(editButton)

                        const archiveActivateButton = buildArchiveActivateButtonForModel(params.data.id, params.data.active, archiveEventOnClick, activateEventOnClick)
                        div.appendChild(archiveActivateButton)

                        return div
                    }
                    return buildActionButtonsForModel(params.data.id, params.data.active, archiveEventOnClick, activateEventOnClick, 'edit-external-event-modal', prepEditEventForm)
                },
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('events-data-grid') as HTMLElement
    gridApi = createGrid(gridElement, gridOptions)

    populateEventsTable()
}

async function populateEventsTable() {
    const response = await getEvents()
    let allEvents = response.data
    if (gridApi) {
        gridApi.setGridOption('rowData', allEvents)
    }
}


// Event listeners
document.addEventListener("DOMContentLoaded", initialiseAgGrid);
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).editExternalEventOnClick = editExternalEventOnClick;
        (<any>window).unlinkExternalEventOnClick = unlinkExternalEventOnClick;
    }
});