import {
    getRoleNames,
    getAttendanceForEvent,
    addAttendance,
    editAttendance,
    getCurrentUserId,
    getUsersField,
    getAttendanceForUser,
    getnextEvent,
    getEventNames,
    getEvent
} from '@global/endpoints'
import { Metadata, VolunteerAttendance, Event } from "@global/endpoints_interfaces";
import { animateElement, buildQueryString, createDropdown, emptyElement, errorToast, formatDate, successToast, validateTextInput, warningToast } from '@global/helper';
import { QueryStringData } from '@global/interfaces';
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let gridApi:GridApi<any>;

let volunteerRoleIds:number[] = []
let EventId = 1
let CurrentUserId = 0
let currentAttendanceData:VolunteerAttendance|null = null

let userDisplayNamesMap:Record<number, string> = {}
let eventNamesMap:Record<number, Partial<Event>> = {}
let eventAttendancesMetaData:Metadata = {}
let eventAttendances:Partial<VolunteerAttendance>[] = []

let noteInputValid:boolean = false

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        domLayout: 'autoHeight',
        defaultColDef: {
            wrapHeaderText: true,
            autoHeaderHeight: true,
            resizable:false
        },
        columnDefs: [
            {
                field: 'user_display_name',
                headerName: 'Name',
                cellClassRules: {
                    'current-user': params => {
                        if (params.data[1].user_id === CurrentUserId) {
                            return true
                        }
                    }
                },
                cellRenderer: (params:any) => {
                    const data = params.data[1]
                    if (data.user_id) {
                        if (userDisplayNamesMap[data.user_id]) {
                            return userDisplayNamesMap[data.user_id]
                        } else {
                            return 'Unknown User'
                        }
                    }
                },
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                pinned: true,
                maxWidth: 200,
                initialWidth: 150
            },
            {
                field: `setup (${eventAttendancesMetaData.setup_count}/${Object.keys(userDisplayNamesMap).length})`,
                cellDataType: 'boolean',
                colSpan: (params:any) => {
                    const data = params.data[1]

                    if (data.setup === undefined || data.setup === null) {
                        return 5
                    } else {
                        return 1
                    }
                },
                cellClassRules: {
                    'status-yes': params => params.data[1].setup && !params.data[1].noReply,
                    'status-no': params => !params.data[1].setup && !params.data[1].noReply,
                    'status-no-reply': params => params.data[1].noReply,
                },
                cellRenderer: (params:any) => {
                    const data = params.data[1]
                    if (data.setup === undefined || data.setup === null) {
                        return 'Not Replied'
                    } else {
                        return data.setup
                    }
                },
                width: 97,
            },
            {
                field: `main (${eventAttendancesMetaData.main_count}/${Object.keys(userDisplayNamesMap).length})`,
                cellDataType: 'boolean',
                cellClassRules: {
                    'status-yes': params => params.data[1].main && !params.data[1].noReply,
                    'status-no': params => !params.data[1].main && !params.data[1].noReply,
                },
                cellRenderer: (params:any) => {
                    const data = params.data[1]
                    if (data.main !== null && data.main !== undefined) {
                        return data.main
                    }
                },
                width: 97,
            },
            {
                field: `packdown (${eventAttendancesMetaData.packdown_count}/${Object.keys(userDisplayNamesMap).length})`,
                cellClassRules: {
                    'status-yes': params => params.data[1].packdown && !params.data[1].noReply,
                    'status-no': params => !params.data[1].packdown && !params.data[1].noReply,
                },
                cellRenderer: (params:any) => {
                    const data = params.data[1]
                    if (data.packdown !== null && data.packdown !== undefined) {
                        return data.packdown
                    }
                },
                width: 97,
            },
            {
                field: 'note',
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                cellRenderer: (params:any) => {
                    const data = params.data[1]
                    if (data.note) {
                        return data.note
                    }
                },
                flex: 1,
                minWidth: 200
            },
        ]
    }

    const gridElement = document.getElementById('volunteer-attendance-data-grid')
    gridApi = createGrid(gridElement, gridOptions)
}


async function preLoadUserDisplayNames() {
    const data:Partial<QueryStringData> = {
        role_ids: volunteerRoleIds
    }
    const queryString = buildQueryString(data)
    const response = await getUsersField('display_name', queryString)
    let userDisplayNames = response.data
    let userDisplayNamesMap:Record<number, string> = {}
    userDisplayNames.forEach(userInfo => {
        userDisplayNamesMap[userInfo.id] = userInfo.display_name
    })
    return userDisplayNamesMap
}

async function loadAttendanceData() {
    const eventAttendanceResponse = await getAttendanceForEvent(EventId)
    userDisplayNamesMap = await preLoadUserDisplayNames()
    eventAttendancesMetaData = eventAttendanceResponse.metadata

    eventAttendances = Object.keys(userDisplayNamesMap).map((id) => {
        for (const attendance of eventAttendanceResponse.data) {
            if (attendance.user_id === Number(id)) {
                return attendance
            }
        }
        const notRepliedAttendance:Partial<VolunteerAttendance> = {
            user_id: Number(id),
            noReply:true
        }

        return notRepliedAttendance
    })
    .sort((a, b) => {
        const getScore = (item:Partial<VolunteerAttendance>) => {
            return (item.user_id === CurrentUserId ? 10 : 0) + (item.main ? 4 : 0) + (item.setup ? 2 : 0) + (item.packdown ? 1 : 0)
        }

        return getScore(b) - getScore(a)
    })
}

async function populateVolunteerAttendanceTable(loadData:boolean=true) {
    const gridElement = document.getElementById('volunteer-attendance-data-grid')
    if (loadData) {
        await loadAttendanceData()
    }

    emptyElement(gridElement)
    initialiseAgGrid()
    gridApi.setGridOption('rowData', Object.entries(eventAttendances))
}


async function addAttendanceOnClick() {
    const updateButton = document.getElementById('update-attendance-button') as HTMLButtonElement

    const setupInput = document.getElementById('update-attendance-setup') as HTMLInputElement
    const mainEventInput = document.getElementById('update-attendance-main') as HTMLInputElement
    const packdownInput = document.getElementById('update-attendance-packdown') as HTMLInputElement
    const noteInput = document.getElementById('update-attendance-note') as HTMLInputElement

    noteInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (!noteInputValid) {
        animateElement(updateButton, 'element-shake')
        return
    }
    
    const data:Partial<VolunteerAttendance> = {
        setup: setupInput.checked,
        main: mainEventInput.checked,
        packdown: packdownInput.checked,
        note: noteInput.value
    }

    addAttendance(CurrentUserId, EventId, data).then((response) => {
        currentAttendanceData = response.data

        successToast(response.message)
        populateVolunteerAttendanceTable()
        populateUpdateForm()
        loadAttendance()
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

async function editAttendanceOnClick() {
    const updateButton = document.getElementById('update-attendance-button') as HTMLButtonElement

    const setupInput = document.getElementById('update-attendance-setup') as HTMLInputElement
    const mainEventInput = document.getElementById('update-attendance-main') as HTMLInputElement
    const packdownInput = document.getElementById('update-attendance-packdown') as HTMLInputElement
    const noteInput = document.getElementById('update-attendance-note') as HTMLInputElement

    noteInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (!noteInputValid) {
        animateElement(updateButton, 'element-shake')
        return
    }
    
    const data:Partial<VolunteerAttendance> = {
        setup: setupInput.checked,
        main: mainEventInput.checked,
        packdown: packdownInput.checked,
        note: noteInput.value
    }

    editAttendance(CurrentUserId, EventId, data).then((response) => {
        currentAttendanceData = response.data

        successToast(response.message)
        populateVolunteerAttendanceTable()
        populateUpdateForm()
        loadAttendance()
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

async function populateUpdateForm() {
    const updateButton = document.getElementById('update-attendance-button') as HTMLButtonElement
    const updateAttendanceFormTitle = document.getElementById('update-attendance-title')

    const setupInput = (document.getElementById('update-attendance-setup') as HTMLInputElement)
    const mainInput = (document.getElementById('update-attendance-main') as HTMLInputElement)
    const packdownInput = (document.getElementById('update-attendance-packdown') as HTMLInputElement)
    const noteInput = (document.getElementById('update-attendance-note') as HTMLInputElement)

    if (currentAttendanceData === null) {
        // User hasnt submitted attendance yet
        updateButton.onclick = addAttendanceOnClick
        updateButton.querySelector('.btn-text').innerHTML = 'Add Attendance'
        updateAttendanceFormTitle.innerHTML = 'Add Attendance'

        setupInput.checked = false
        mainInput.checked = false
        packdownInput.checked = false
        noteInput.value = ''
    }
    else {
        updateButton.onclick = editAttendanceOnClick
        updateButton.querySelector('.btn-text').innerHTML = 'Update Attendance'
        updateAttendanceFormTitle.innerHTML = 'Update Attendance'

        setupInput.checked = Boolean(currentAttendanceData.setup)
        mainInput.checked = Boolean(currentAttendanceData.main)
        packdownInput.checked = Boolean(currentAttendanceData.packdown)
        noteInput.value = String(currentAttendanceData.note)
        
    }
}

// Populates the Event selection dropdown with all of the events
async function populateEventSelectionDropdown() {
    let eventSelectionDropdown = document.getElementById('event-selection')

    let defaultValue = 'Select an Event'
    if (eventNamesMap[EventId] !== undefined && eventNamesMap[EventId] !== null) {
        defaultValue = eventNamesMap[EventId].name
    }
    let select = createDropdown(Object.values(eventNamesMap), defaultValue, eventSelectionDropdownOnChange)
    select.id = 'event-select'
    select.classList.add('select-event-dropdown', 'form-control')
    eventSelectionDropdown.appendChild(select)
}

// Handles the onchange event for the Event selction dropdown 
function eventSelectionDropdownOnChange(event:any) {
    const element = event.target as HTMLInputElement
    const selectedValue = Number(element.value)
    EventId = selectedValue
    getEvent(EventId)
    populateEventDetails()
    loadAttendance()
}

async function populateEventDetails() {
    const eventInfoText = document.getElementById('event-info')

    const updateAttendanceCard = document.getElementById('update-attendance-card') as HTMLDivElement
    const updateAttendanceButton = document.getElementById('update-attendance-button') as HTMLButtonElement

    if (EventId !== -1) {
        let event = await getEvent(EventId)
        eventInfoText.innerHTML = `<strong>${event.name}</strong> - ${formatDate(event.date)}`
        updateAttendanceCard.style.display = 'block'
        updateAttendanceButton.style.display = 'block'
        return
    }

    eventInfoText.innerHTML = 'No Upcomming Events. Please select one from the dropdown'
    updateAttendanceCard.style.display = 'none'
    updateAttendanceButton.style.display = 'none'
}

async function loadAttendance() {
    await getAttendanceForUser(CurrentUserId, EventId).then((response) => {
        currentAttendanceData = response
    }).catch(() => {
        warningToast('You have not filled out your attendance')
        currentAttendanceData = null
    })

    volunteerRoleIds = []
    const roleIdResponse = await getRoleNames('name=volunteer')
    let roleId = roleIdResponse.data[0].id
    volunteerRoleIds.push(roleId)

    populateUpdateForm()

    await loadAttendanceData()
    populateVolunteerAttendanceTable(false)
}

async function preLoadEventNames() {
    const response = await getEventNames()
    let eventNames = response.data
    let eventNamesMap:Record<number, Partial<Event>> = {}
    eventNames.forEach(event => {
        eventNamesMap[event.id] = event
    })
    return eventNamesMap
}


document.addEventListener("DOMContentLoaded", async () => {
    const queryData:Partial<QueryStringData> = {
        inclusive: false
    }
    const queryString = buildQueryString(queryData)
    EventId = (await getnextEvent(queryString)).data

    CurrentUserId = await getCurrentUserId()
    eventNamesMap = await preLoadEventNames()
    populateEventDetails()
    populateEventSelectionDropdown()

    if (EventId === -1) {
        return
    }

    loadAttendance()
    
});

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // Note
    const attendanceNoteInput = document.getElementById('update-attendance-note') as HTMLInputElement
    attendanceNoteInput.oninput = () => {
        noteInputValid = validateTextInput(attendanceNoteInput, null, false, true)
    }
})