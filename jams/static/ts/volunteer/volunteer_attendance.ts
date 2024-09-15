import {
    getRoleNames,
    getAttendanceForEvent,
    addAttendance,
    editAttendance,
    getCurrentUserId,
    getUsersField,
    getAttendanceForUser
} from '@global/endpoints'
import { VolunteerAttendance } from "@global/endpoints_interfaces";
import { animateElement, buildQueryString, errorToast, successToast, validateNumberInput, validateTextInput } from '@global/helper';
import { QueryStringData } from '@global/interfaces';
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let gridApi:GridApi<any>;

let volunteerRoleIds:number[] = []
let EventId = 1
let CurrentUserId = 0
let currentAttendanceData:VolunteerAttendance|null = null

let userDisplayNamesMap:Record<number, string> = {}

let noteInputValid:boolean = false

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        domLayout: 'autoHeight',
        autoSizeStrategy: {
            type: 'fitCellContents'
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
                pinned: true,
                maxWidth: 200,
                flex: 1
            },
            {
                field: 'setup',
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
                maxWidth: 100,
                flex: 1
            },
            {
                field: 'main',
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
                maxWidth: 100,
                flex: 1
            },
            {
                field: 'packdown',
                cellClassRules: {
                    'status-yes': params => params.data[1].packdown && !params.data[1].noReply,
                    'status-no': params => !params.data[1].packdown && !params.data[1].noReply,
                },
                cellRenderer: (params:any) => {
                    const data = params.data[1]
                    if (data.packdown !== null && data.packdown !== undefined) {
                        console.log(data)
                        return data.packdown
                    }
                },
                maxWidth: 100,
                flex: 1
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
                maxWidth: 800,
                flex: 1
            },
        ]
    }

    const gridElement = document.getElementById('volunteer-attendance-data-grid')
    gridApi = createGrid(gridElement, gridOptions)
    populateVolunteerAttendanceTable()
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

async function populateVolunteerAttendanceTable() {
    const eventAttendanceResponses = (await getAttendanceForEvent(EventId)).data
    userDisplayNamesMap = await preLoadUserDisplayNames()

    let eventAttendances:Partial<VolunteerAttendance>[] = Object.keys(userDisplayNamesMap).map((id) => {
        for (const attendance of eventAttendanceResponses) {
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
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

async function populateUpdateForm() {
    const updateButton = document.getElementById('update-attendance-button') as HTMLButtonElement
    const updateAttendanceFormTitle = document.getElementById('update-attendance-title')

    if (currentAttendanceData == null) {
        // User hasnt submitted attendance yet
        updateButton.onclick = addAttendanceOnClick
        updateButton.querySelector('.btn-text').innerHTML = 'Add Attendance'
        updateAttendanceFormTitle.innerHTML = 'Add Attendance'
    }
    else {
        updateButton.onclick = editAttendanceOnClick
        updateButton.querySelector('.btn-text').innerHTML = 'Update Attendance'
        updateAttendanceFormTitle.innerHTML = 'Update Attendance'

        const setupInput = (document.getElementById('update-attendance-setup') as HTMLInputElement)
        const mainInput = (document.getElementById('update-attendance-main') as HTMLInputElement)
        const packdownInput = (document.getElementById('update-attendance-packdown') as HTMLInputElement)
        const noteInput = (document.getElementById('update-attendance-note') as HTMLInputElement)

        setupInput.checked = Boolean(currentAttendanceData.setup)
        mainInput.checked = Boolean(currentAttendanceData.main)
        packdownInput.checked = Boolean(currentAttendanceData.packdown)
        noteInput.value = String(currentAttendanceData.note)
        
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    CurrentUserId = await getCurrentUserId()
    await getAttendanceForUser(CurrentUserId, EventId).then((response) => {
        currentAttendanceData = response
    }).catch(() => {
        return
    })

    const roleIdResponse = await getRoleNames('name=volunteer')
    let roleId = roleIdResponse.data[0].id
    volunteerRoleIds.push(roleId)

    populateUpdateForm()
    initialiseAgGrid()
});

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // Note
    const attendanceNoteInput = document.getElementById('update-attendance-note') as HTMLInputElement
    attendanceNoteInput.oninput = () => {
        noteInputValid = validateTextInput(attendanceNoteInput, null, false, true)
    }
})