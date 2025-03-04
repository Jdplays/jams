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

document.addEventListener("DOMContentLoaded", async function () {
    let bodyContainer = document.getElementById('body-container')
    bodyContainer.classList.remove('container')
    bodyContainer.classList.add('container-fluid')

    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()

    scheduleGridOptions.eventId = eventDetails.eventId
    scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)
    scheduleGrid.init()
});