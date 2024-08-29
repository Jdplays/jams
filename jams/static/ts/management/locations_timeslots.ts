import {
    getLocations,
    getLocation,
    addLocation,
    editLocation,
    archiveLocation,
    activateLocation,
    getTimeslots,
    getTimeslot,
    addTimeslot,
    editTimeslot,
    archiveTimeslot,
    activateTimeslot
} from '@global/endpoints'
import { RequestMultiModelJSONData } from '@global/endpoints_interfaces'
import { buildActionButtonsForModel, successToast, errorToast, isDefined } from "@global/helper";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let locationsGridApi: GridApi<any>;
let timeslostGridApi: GridApi<any>;

async function archiveLocationOnClick(locationId:number) {
    const response = await archiveLocation(locationId)
    if (response) {
        successToast('Location Successfully Archived')
        populateLocationsTable()
    }
    else {
        errorToast()
    }
}

async function activateLocationOnClick(locationId:number) {
    const response = await activateLocation(locationId)
    if (response) {
        successToast('Location Successfully Activated')
        populateLocationsTable()
    }
    else {
        errorToast()
    }
}

async function addLocationOnClick() {
    const data = {
        'name': (document.getElementById('add-location-name') as HTMLInputElement).value,
    }

    const response = await addLocation(data)
    if (response) {
        successToast('Location Successfully Added')
        populateLocationsTable()
    }
    else {
        errorToast()
    }
}

async function editLocationOnClick() {
    const locationId = Number((document.getElementById('edit-location-id') as HTMLInputElement).value)
    const data:Partial<RequestMultiModelJSONData> = {
        'name': (document.getElementById('edit-location-name') as HTMLInputElement).value,
    }

    const response = await editLocation(locationId, data)
    if (response) {
        successToast('Location Successfully Edited')
        populateLocationsTable()
    }
    else {
        errorToast()
    }
}

async function prepEditLocationForm(locationId:number) {
    let location = await getLocation(locationId)

    const hiddenIdInput = document.getElementById('edit-location-id') as HTMLInputElement
    const nameInput = document.getElementById('edit-location-name') as HTMLInputElement

    hiddenIdInput.value = String(location.id)
    nameInput.value = location.name
}

function initialiseLocationsAgGrid() {
    const gridOptions:GridOptions = {
        columnDefs: [
            {field: 'name', flex: 1},
            {
                field: 'options', cellRenderer: (params:any) => {
                    return buildActionButtonsForModel(params.data.id, params.data.active, archiveLocationOnClick, activateLocationOnClick, 'edit-location-modal', prepEditLocationForm)
                },
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('locations-data-grid') as HTMLElement
    locationsGridApi = createGrid(gridElement, gridOptions)

    populateLocationsTable()
}

async function populateLocationsTable() {
    const allLocationsResponse = await getLocations()
    let allLocations = allLocationsResponse.data

    locationsGridApi.setGridOption('rowData', allLocations)
}

// Event listeners
document.addEventListener("DOMContentLoaded", initialiseLocationsAgGrid);
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).addLocationOnClick = addLocationOnClick;
        (<any>window).editLocationOnClick = editLocationOnClick;
    }
});


async function archiveTimeslotOnClick(timeslotId:number) {
    const response = await archiveTimeslot(timeslotId)
    if (response) {
        successToast('Timeslot Successfully Archived')
        populateTimeslotsTable()
    }
    else {
        errorToast()
    }
}

async function activateTimeslotOnClick(timeslotId:number) {
    const response = await activateTimeslot(timeslotId)
    if (response) {
        successToast('Timeslot Successfully Activated')
        populateTimeslotsTable()
    }
    else {
        errorToast()
    }
}

async function addTimeslotOnClick() {
    const data:Partial<RequestMultiModelJSONData> = {
        'name': (document.getElementById('add-timeslot-name') as HTMLInputElement).value,
        'start': (document.getElementById('add-timeslot-start-time') as HTMLInputElement).value,
        'end': (document.getElementById('add-timeslot-end-time') as HTMLInputElement).value
    }

    const response = await addTimeslot(data)
    if (response) {
        successToast('Timeslot Successfully Added')
        populateTimeslotsTable()
    }
    else {
        errorToast()
    }
}

async function editTimeslotOnClick() {
    const timeslotID = Number((document.getElementById('edit-timeslot-id') as HTMLInputElement).value)
    const data:Partial<RequestMultiModelJSONData> = {
        'name': (document.getElementById('edit-timeslot-name') as HTMLInputElement).value,
        'start': (document.getElementById('edit-timeslot-start-time') as HTMLInputElement).value,
        'end': (document.getElementById('edit-timeslot-end-time') as HTMLInputElement).value
    }

    const response = await editTimeslot(timeslotID, data)
    if (response) {
        successToast('Timeslot Successfully Edited')
        populateTimeslotsTable()
    }
    else {
        errorToast()
    }
}

async function prepEditTimeslotForm(timeslotId:number) {
    let timeslot = await getTimeslot(timeslotId)

    const hiddenIdInput = document.getElementById('edit-timeslot-id') as HTMLInputElement
    const nameInput = document.getElementById('edit-timeslot-name') as HTMLInputElement
    const startInput = document.getElementById('edit-timeslot-start-time') as HTMLInputElement
    const endInput = document.getElementById('edit-timeslot-end-time') as HTMLInputElement

    hiddenIdInput.value = String(timeslotId)
    nameInput.value = timeslot.name
    startInput.value = timeslot.start
    endInput.value = timeslot.end
}

function initialiseTimeslotsAgGrid() {
    const gridOptions:GridOptions = {
        columnDefs: [
            {field: 'name', flex: 1},
            {field: 'start', flex: 1},
            {field: 'end', flex: 1},
            {
                field: 'options', cellRenderer: (params:any) => {
                    return buildActionButtonsForModel(params.data.id, params.data.active, archiveTimeslotOnClick, activateTimeslotOnClick, 'edit-timeslot-modal', prepEditTimeslotForm)
                },
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('timeslots-data-grid') as HTMLElement
    timeslostGridApi = createGrid(gridElement, gridOptions)

    populateTimeslotsTable()
}

async function populateTimeslotsTable() {
    const allTimeslotsResponse = await getTimeslots()
    let allTimeslots = allTimeslotsResponse.data

    timeslostGridApi.setGridOption('rowData', allTimeslots)
}



// Event listeners
document.addEventListener("DOMContentLoaded", initialiseTimeslotsAgGrid);
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).addTimeslotOnClick = addTimeslotOnClick;
        (<any>window).editTimeslotOnClick = editTimeslotOnClick;
    }
});