import {
    getEvents,
    getEvent,
    addNewEvent,
    editEvent,
    archiveEvent,
    activateEvent
} from "../global/endpoints"
import { RequestMultiModelJSONData, Event } from "../global/endpoints_interfaces";
import { buildActionButtonsForModel, successToast, errorToast } from "../global/helper";
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


async function addEventOnClick() {
    const data:Partial<RequestMultiModelJSONData> = {
        'name': (document.getElementById('add-event-name') as HTMLInputElement).value || '',
        'description': (document.getElementById('add-event-description') as HTMLInputElement).value || '',
        'date': (document.getElementById('add-event-date') as HTMLInputElement).value || '',
        'password': (document.getElementById('add-event-password') as HTMLInputElement).value || '',
    }

    const response = await addNewEvent(data)
    if (response) {
        successToast('Event Successfully Added')
        populateEventsTable()
    }
    else {
        errorToast()
    }
}

async function editEventOnClick() {
    const eventID:number = Number((document.getElementById('edit-event-id') as HTMLInputElement).value)
    const data:Partial<RequestMultiModelJSONData> = {
        'name': (document.getElementById('edit-event-name') as HTMLInputElement).value || '',
        'description': (document.getElementById('edit-event-description') as HTMLInputElement).value || '',
        'date': (document.getElementById('edit-event-date') as HTMLInputElement).value || '',
        'password': (document.getElementById('edit-event-password') as HTMLInputElement).value || '',
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

    const hiddenIdInput = document.getElementById('edit-event-id') as HTMLInputElement
    const nameInput = document.getElementById('edit-event-name') as HTMLInputElement
    const descriptionInput = document.getElementById('edit-event-description') as HTMLInputElement
    const dateInput = document.getElementById('edit-event-date') as HTMLInputElement
    const passwordInput = document.getElementById('edit-event-password') as HTMLInputElement

    hiddenIdInput.value = String(eventId)
    nameInput.value = event.name
    descriptionInput.value = event.description
    dateInput.value = event.date
    passwordInput.value = event.password
}

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        columnDefs: [
            {field: 'name', flex: 1},
            {field: 'description', flex: 1},
            {field: 'date', flex: 1},
            {field: 'password', flex: 1},
            {
                field: 'options', cellRenderer: (params:any) => {
                    return buildActionButtonsForModel(params.data.id, params.data.active, archiveEventOnClick, activateEventOnClick, 'edit-event-modal', prepEditEventForm)
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
    if (typeof window !== 'undefined') {
        (<any>window).addEventOnClick = addEventOnClick;
        (<any>window).editEventOnClick = editEventOnClick;
    }
});