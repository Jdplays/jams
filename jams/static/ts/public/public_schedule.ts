import { EventDetails, EventDetailsOptions } from '@global/event_details';
import {ScheduleGrid, ScheduleGridOptions} from '@global/schedule_grid'

const scheduleGridOptions:ScheduleGridOptions = {
    eventId: 1,
    edit: false,
    autoScale: true,
    showPrivate: false,
    showAttendeeSignupCounts: true,
    buildKey: true
}

const eventDetailsOptions:EventDetailsOptions = {
    showEventSelection: false
}

let eventDetails:EventDetails;
let scheduleGrid:ScheduleGrid;

function onEventChangeFunc() {
    if (!scheduleGrid) {
        loadPublicSchedule()
        return
    }
    loadPublicSchedule(true)
}

async function loadPublicSchedule(reloadGrid:boolean=false) {
    if (!eventDetails.eventId) {
        return
    }

    scheduleGridOptions.eventId = eventDetails.eventId

    if (reloadGrid) {
            await scheduleGrid.updateOptions(scheduleGridOptions)
        } else {
            scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)
            await scheduleGrid.init()
        }
}

document.addEventListener("DOMContentLoaded", async function () {
    let bodyContainer = document.getElementById('body-container')
    bodyContainer.classList.remove('container')
    bodyContainer.classList.add('container-fluid')

    eventDetails = new EventDetails('event-details', {eventOnChangeFunc: onEventChangeFunc})
    await eventDetails.init()

    loadPublicSchedule()
});