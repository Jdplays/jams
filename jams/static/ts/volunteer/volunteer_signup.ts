import { addAttendance, getAttendanceForEvent, getCurrentUserId } from "@global/endpoints";
import { User, VolunteerAttendance } from "@global/endpoints_interfaces";
import { EventDetails, EventDetailsOptions } from "@global/event_details";
import { buildUserAvatar, emptyElement, errorToast, preloadUsersInfoMap, successToast } from "@global/helper";
import { ScheduleGrid, ScheduleGridOptions } from "@global/schedule_grid";

const eventDetailsOptions:EventDetailsOptions = {
    eventOnChangeFunc: onEventChangeFunc
}

if (document.getElementById('select-user-container')) {
    eventDetailsOptions.eventDependentElements = [document.getElementById('select-user-container')]
}

let eventDetails:EventDetails;

const scheduleGridOptions:ScheduleGridOptions = {
    eventId: 1,
    edit: false,
    autoScale: true,
    showPrivate: true,
    showVolunteerSignup:true
}

let scheduleGrid:ScheduleGrid

let CurrentUserId:number = 1
let selectedUserId:number = CurrentUserId
let usersInfoMap:Record<number, Partial<User>> = {}
let eventAttendances:Partial<VolunteerAttendance>[] = []

function onEventChangeFunc() {
    if (!scheduleGrid) {
        loadSignupData()
        return
    }
    loadSignupData(true)

}

function populateUsersDropdown() {
    const dropdownButton = document.getElementById('select-user-dropdown-button') as HTMLAnchorElement
    if (!dropdownButton) {
        return
    }

    dropdownButton.innerHTML = usersInfoMap[selectedUserId].display_name

    const dropdown = document.getElementById('select-user-dropdown') as HTMLDivElement
    emptyElement(dropdown)

    for (const attendance of eventAttendances) {
        let item = document.createElement('a')
        item.classList.add('dropdown-item')

        const avatarContainer = document.createElement('span')
        avatarContainer.classList.add('dropdown-item-indicator')
        const avatar = buildUserAvatar(usersInfoMap[attendance.user_id], 25)
        avatarContainer.appendChild(avatar)

        const name = document.createElement('span')
        name.innerHTML = usersInfoMap[attendance.user_id].display_name
        name.style.paddingRight = '20px'

        let badge = document.createElement('span')
        badge.classList.add('badge', 'ms-auto')

        if (attendance.user_id !== CurrentUserId) {
            if (attendance.main) {
                badge.classList.add('bg-green')
            } else {
                badge.classList.add('bg-red')
            }
        } else {
            badge.classList.add('bg-blue')
        }

        item.appendChild(avatarContainer)
        item.appendChild(name)
        item.appendChild(badge)

        item.onclick = function () {
            userSelectItemOnClick(attendance.user_id)
        }

        dropdown.appendChild(item)
    }
}

async function userSelectItemOnClick(userId:number) {
    const dropdownButton = document.getElementById('select-user-dropdown-button') as HTMLAnchorElement
    dropdownButton.innerHTML = usersInfoMap[userId].display_name

    selectedUserId = userId
    await loadSignupData(true)
}

async function loadUsersAttendingEvent() {
    if (!eventDetails.eventId) {
        return
    }
    const eventAttendanceResponse = await getAttendanceForEvent(eventDetails.eventId)
    eventAttendances = Object.keys(usersInfoMap).map((id) => {
        for (const attendance of eventAttendanceResponse.data) {
            if (attendance.user_id === Number(id)) {
                return attendance
            }
        } const notRepliedAttendance:Partial<VolunteerAttendance> = {
            user_id: Number(id),
            noReply: true
        }

        return notRepliedAttendance
    })
    .sort((a, b) => {
        const getScore = (item:Partial<VolunteerAttendance>) => {
            return (item.user_id === CurrentUserId ? 10 : 0) + (item.main ? 4 : 0)
        }

        return getScore(b) - getScore(a)
    })
}

function checkUserIsAttendingEvent() {
    if (!scheduleGridOptions.volunteerSignup && scheduleGrid.scheduleValid) {
        let confirmDeleteModal = $('#user-no-attendance-modal')
        confirmDeleteModal.modal('show')
        confirmDeleteModal.find('#user-no-attendance-text').html(`
            It appears that "${usersInfoMap[selectedUserId].display_name}" is not attending this event. Would you like to update your attendance?<br><br>If you select 'No,' you won't be able to sign up for workshops, but you can still view the schedule. 
        `);

        confirmDeleteModal.find('#user-no-attendance-update').click(() => {
            const data:Partial<VolunteerAttendance> = {
                main:true,
                note: 'I Forgot to update my attendance, so JAMS had to do it for me :('
            }
            addAttendance(selectedUserId, eventDetails.eventId, data).then((response) => {
                successToast(response.message)
                loadSignupData(true)
            }).catch((error) => {
                const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
                errorToast(errorMessage)
            })
        })
    }
}

function updateSignupPermissions() {
    scheduleGridOptions.volunteerSignup = false
    for (const attendance of eventAttendances) {
        if (attendance.user_id === selectedUserId && attendance.main) {
            scheduleGridOptions.volunteerSignup = true
        }
    }
}

async function loadSignupData(reloadGrid:boolean=false) {
    if (!eventDetails.eventId) {
        return
    }
    await loadUsersAttendingEvent()

    populateUsersDropdown()

    scheduleGridOptions.eventId = eventDetails.eventId
    scheduleGridOptions.userId = selectedUserId
    scheduleGridOptions.userInfoMap = usersInfoMap

    updateSignupPermissions()

    if (reloadGrid) {
        await scheduleGrid.updateOptions(scheduleGridOptions)
    } else {
        scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)
        await scheduleGrid.init()
    }

    checkUserIsAttendingEvent()
}

document.addEventListener("DOMContentLoaded", async () => {
    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()
    usersInfoMap = await preloadUsersInfoMap()

    CurrentUserId = await getCurrentUserId()
    selectedUserId = CurrentUserId

    loadSignupData()
});

document.addEventListener("DOMContentLoaded", function () {
    let bodyContainer = document.getElementById('body-container')
    bodyContainer.classList.remove('container')
    bodyContainer.classList.add('container-fluid')
});