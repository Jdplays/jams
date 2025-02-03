import {
    getRoleNames,
    getAttendanceForEvent,
    addAttendance,
    editAttendance,
    getCurrentUserId,
    getUsersField,
    getAttendanceForUser,
    getRoles,
} from '@global/endpoints'
import { Metadata, Role, User, VolunteerAttendance } from "@global/endpoints_interfaces";
import { EventDetails, EventDetailsOptions } from '@global/event_details';
import { animateElement, buildQueryString, buildRoleBadge, buildUserAvatar, emptyElement, errorToast, successToast, validateTextInput, warningToast } from '@global/helper';
import { QueryStringData } from '@global/interfaces';
import { createGrid, GridApi, GridOptions, ITooltipComp, ITooltipParams } from 'ag-grid-community';
import { param } from 'jquery';
import { use } from 'marked';

let gridApi:GridApi<any>;
let eventDetails:EventDetails;

let rolesMap:Record<number,Role> = {};
let volunteerRoleIds:number[] = []
let CurrentUserId = 0
let currentAttendanceData:VolunteerAttendance|null = null

let userInfoMap:Record<number, Partial<User>> = {}
let eventAttendancesMetaData:Metadata = {}
let eventAttendances:Partial<VolunteerAttendance>[] = []

let noteInputValid:boolean = false

class UserToolTip implements ITooltipComp {
    private tooltipElement: HTMLDivElement

    init(params: any) {
        const user = userInfoMap[params.value]
        if (!user) {
            return
        }

        this.tooltipElement = document.createElement('div')
        const avatar = buildUserAvatar(user)

        const tmpRolesContainer = document.createElement('div')
        if (user.badge_text) {
            const tag = document.createElement('span')
            tag.classList.add('tag-with-indicator')
            tag.style.width = 'fit-content'
            tag.style.borderRadius = '90px'
            tag.style.cursor = 'pointer'
            
            const text = document.createElement('span')
            text.innerHTML = user.badge_text
            tag.appendChild(text)
    
            if (user.badge_icon) {
                const icon = document.createElement('i')
                icon.classList.add('ti', `ti-${user.badge_icon}`, 'ms-2')
                icon.style.color = 'rgb(255, 215, 0)'
                tag.appendChild(icon)
            }
    
            tmpRolesContainer.appendChild(tag)
        } else {
            const userRoles = user.role_ids
                .map(roleId => rolesMap[roleId])
                .filter(role => role !== undefined)
                .sort((a, b) => a.priority - b.priority)
            
                const badge = buildRoleBadge(userRoles[0], null, true)
                tmpRolesContainer.appendChild(badge)
        }

        this.tooltipElement.classList.add('custom-tooltip')
        this.tooltipElement.innerHTML = `
            <a href="/private/users/${user.id}" class="text-decoration-none">
                <div class="card card-sm">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-auto">
                                ${avatar.outerHTML}
                            </div>
                            <div class="col">
                                <div class="text-truncate">
                                    ${user.display_name}
                                </div>
                                <div id="user-roles-container" class="d-flex flex-wrap mb-2">
                                    ${tmpRolesContainer.innerHTML}
                                </div>
                            </div>
                            <div class="col-auto d-flex align-items-center">
                                <i class="ti ti-chevron-right text-muted"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
            `;
    }

    getGui() {
        return this.tooltipElement
    }
    
}

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        domLayout: 'autoHeight',
        tooltipShowDelay:100,
        tooltipInteraction: true,
        defaultColDef: {
            wrapHeaderText: true,
            autoHeaderHeight: true,
            resizable:false
        },
        columnDefs: [
            {
                field: 'user_id',
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
                        if (userInfoMap[data.user_id]) {
                            const div = document.createElement('div')
                            div.classList.add('d-flex', 'justify-content-center', 'align-items-center')

                            const nameText = document.createElement('p')
                            nameText.innerHTML = userInfoMap[data.user_id].display_name
                            div.appendChild(nameText)

                            const icon = document.createElement('i')
                            icon.classList.add('ti', 'ti-chevron-right', 'ms-auto')
                            div.appendChild(icon)
                            return div
                        } else {
                            return 'Unknown User'
                        }
                    }
                },
                tooltipComponent: UserToolTip,
                tooltipValueGetter: (params:any) => params.data[1].user_id,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                pinned: true,
                maxWidth: 200,
                initialWidth: 150
            },
            {
                field: `setup (${eventAttendancesMetaData.setup_count}/${Object.keys(userInfoMap).length})`,
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
                field: `main (${eventAttendancesMetaData.main_count}/${Object.keys(userInfoMap).length})`,
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
                field: `packdown (${eventAttendancesMetaData.packdown_count}/${Object.keys(userInfoMap).length})`,
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


async function preLoadUsersInfo() {
    const data:Partial<QueryStringData> = {
        role_ids: volunteerRoleIds
    }
    const queryString = buildQueryString(data)
    const response = await getUsersField('public_info', queryString)
    let usersInfo = response.data
    let userInfoMap:Record<number, Partial<User>> = {}
    usersInfo.forEach(userInfo => {
        userInfoMap[userInfo.id] = userInfo
    })
    return userInfoMap
}

async function loadAttendanceData() {
    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }
    const queryString = buildQueryString(queryData)

    const eventAttendanceResponse = await getAttendanceForEvent(eventDetails.eventId, queryString)
    userInfoMap = await preLoadUsersInfo()
    eventAttendancesMetaData = eventAttendanceResponse.metadata

    eventAttendances = Object.keys(userInfoMap).map((id) => {
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
            return (item.user_id === CurrentUserId ? 10 : 0) + (item.main ? 4 : 0) + (item.setup ? 2 : 0) + (item.packdown ? 1 : 0) +
            (item.main !== null && item.main !== undefined ? 1 : 0) +
            (item.setup !== null && item.setup !== undefined ? 1 : 0) + 
            (item.packdown !== null && item.packdown !== undefined ? 1 : 0)
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

    addAttendance(CurrentUserId, eventDetails.eventId, data).then((response) => {
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

    editAttendance(CurrentUserId, eventDetails.eventId, data).then((response) => {
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


async function loadAttendance() {
    await getAttendanceForUser(CurrentUserId, eventDetails.eventId).then((response) => {
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

    const roleIdsToLoad = [...new Set(Object.values(userInfoMap).flatMap(user => user.role_ids))];

    rolesMap = await preloadRoles(roleIdsToLoad)
    populateVolunteerAttendanceTable(false)
}

async function preloadRoles(role_ids:number[]) {
    const data:Partial<QueryStringData> = {
        id: role_ids,
        hidden: false
    }
    const queryString = buildQueryString(data)
    const response = await getRoles(queryString);
    let roles = response.data
    let rolesMap:Record<number, Role> = {};
    roles.forEach(role => {
        rolesMap[role.id] = role;
    });
    return rolesMap;
}


document.addEventListener("DOMContentLoaded", async () => {
    const eventDetailsOptions:EventDetailsOptions = {
        dateInclusive: true,
        eventDependentElements: [document.getElementById('update-attendance-button'), document.getElementById('update-attendance-card')],
        eventOnChangeFunc: loadAttendance
    }

    eventDetails = new EventDetails('event-details', eventDetailsOptions)

    const [eventDetailsResponse, userIdResponse] = await Promise.all([
        await eventDetails.init(),
        await getCurrentUserId()
    ]);
        
    CurrentUserId = userIdResponse

    if (eventDetails.eventId === -1) {
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