import {ScheduleGrid} from '@global/schedule_grid'

const scheduleGridOptions = {
    eventId: 1,
    edit: false,
    autoScale: true,
    showPrivate: false,
}

const scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)

document.addEventListener("DOMContentLoaded", async function () {
    let bodyContainer = document.getElementById('body-container')
    bodyContainer.classList.remove('container')
    bodyContainer.classList.add('container-fluid')
});