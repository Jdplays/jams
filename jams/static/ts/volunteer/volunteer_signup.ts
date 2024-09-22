import { getAttendanceForEvent, getCurrentUserId } from "@global/endpoints";
import { User, VolunteerAttendance } from "@global/endpoints_interfaces";
import { EventDetails, EventDetailsOptions } from "@global/event_details";
import { buildUserAvatar, preloadUsersInfoMap } from "@global/helper";
import { ScheduleGrid, ScheduleGridOptions } from "@global/schedule_grid";

const eventDetailsOptions:EventDetailsOptions = {
    eventOnChangeFunc: onEventChangeFunc
}
let eventDetails:EventDetails;

const scheduleGridOptions:ScheduleGridOptions = {
    eventId: 1,
    edit: false,
    autoScale: true,
    showPrivate: true,
    volunteerSignup:true
}

let scheduleGrid:ScheduleGrid

let CurrentUserId:number = 1
let usersInfoMap:Record<number, Partial<User>> = {}
let eventAttendances:Partial<VolunteerAttendance>[] = []

function onEventChangeFunc() {
    scheduleGrid.changeEvent(eventDetails.eventId)
}

function populateUsersDropdown() {
    const dropdownButton = document.getElementById('select-user-dropdown-button') as HTMLAnchorElement
    if (!dropdownButton) {
        return
    }

    dropdownButton.innerHTML = usersInfoMap[CurrentUserId].display_name

    const dropdown = document.getElementById('select-user-dropdown') as HTMLDivElement

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

function userSelectItemOnClick(userId:number) {
    const dropdownButton = document.getElementById('select-user-dropdown-button') as HTMLAnchorElement
    dropdownButton.innerHTML = usersInfoMap[userId].display_name

    scheduleGrid.changeSelectedUser(userId)
}

async function loadUsersAttendingEvent() {
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

document.addEventListener("DOMContentLoaded", async () => {
    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()
    usersInfoMap = await preloadUsersInfoMap()

    const selectedUserId = await getCurrentUserId()
    CurrentUserId = selectedUserId

    await loadUsersAttendingEvent()

    populateUsersDropdown()

    scheduleGridOptions.eventId = eventDetails.eventId
    scheduleGridOptions.userId = selectedUserId
    scheduleGridOptions.userInfoMap = usersInfoMap

    scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)
});

document.addEventListener("DOMContentLoaded", async function () {
    let bodyContainer = document.getElementById('body-container')
    bodyContainer.classList.remove('container')
    bodyContainer.classList.add('container-fluid')
});