import { getAttendeesForAccount, getAttendeesSignupsForAccount, getNextEvent, getSessionsForEvent, getTimeslots, getTimeslotsForEvent, getWorkshops } from "@global/endpoints";
import { Attendee, EventTimeslot, Session, Timeslot, Workshop } from "@global/endpoints_interfaces";
import { buildQueryString, emptyElement } from "@global/helper";
import { QueryStringData } from "@global/interfaces";

let eventId:number
let attendeesMap:Record<number, Attendee>
let workshopsMap:Record<number, Workshop>
let eventTimeslotsMap:Record<number, EventTimeslot>
let timeslotsMap:Record<number, Timeslot>
let attendeeSessionsMap:Record<number, Session[]>
let timeslotSessionsMap:Record<number, Session[]>


async function loadData() {
    // Initialise Maps
    attendeesMap = {}
    workshopsMap = {}
    eventTimeslotsMap = {}
    timeslotsMap = {}
    attendeeSessionsMap = {}
    timeslotSessionsMap = {}

    // Get next event ID
    await getNextEvent().then((response) => {
        eventId = response.data
    })

    // Load attendees info for account
    const attendeesQueryData:Partial<QueryStringData> = {
        event_id: eventId,
        registerable: true,
        checked_in: true
    }
    const attendeesQueryString = buildQueryString(attendeesQueryData)
    const attendeesResponse = await getAttendeesForAccount(attendeesQueryString)
    for (const attendee of attendeesResponse.data) {
        attendeesMap[attendee.id] = attendee
    }

    // Load signup data
    const signupsQueryData:Partial<QueryStringData> = {
            event_id: eventId,
            registerable: true,
            $all_rows: true
        }
    const signupsQueryString = buildQueryString(signupsQueryData)
    const signupsResponse = await getAttendeesSignupsForAccount(signupsQueryString)

    // Load Sessions
    const sessionIds = signupsResponse.data.map((signup) => signup.session_id)
    const sessionsQueryData:Partial<QueryStringData> = {
        id: sessionIds
    }
    const sessionsQueryString = buildQueryString(sessionsQueryData)
    const sessionsResponse = await getSessionsForEvent(eventId, sessionsQueryString)

    // LOad all workshops used by the sessions
    const workshopIds = sessionsResponse.data.map((session) => {
        if (session.has_workshop) {
            return session.workshop_id
        }
    })
    const workshopsQueryData:Partial<QueryStringData> = {
        id: workshopIds
    }
    const workshopsQueryString = buildQueryString(workshopsQueryData)
    const workshopsResponse = await getWorkshops(workshopsQueryString)
    for (const workshop of workshopsResponse.data) {
        workshopsMap[workshop.id] = workshop
    }

    // Load Event timeslots used by the sessions
    const eventTimeslotIds = sessionsResponse.data.map((session) => session.event_timeslot_id)
    const eventTimeslotsQueryData:Partial<QueryStringData> = {
        id: eventTimeslotIds
    }
    const eventTimeslotsQueryString = buildQueryString(eventTimeslotsQueryData)
    const eventTimeslotsResponse = await getTimeslotsForEvent(eventId, eventTimeslotsQueryString)
    for (const et of eventTimeslotsResponse) {
        eventTimeslotsMap[et.id] = et
    }

    // Load needed timeslots
    const timeslotsIds = eventTimeslotsResponse.map((eventTimeslot) => {
        if (sessionsResponse.data.find((session) => session.event_timeslot_id === eventTimeslot.id)) {
            return eventTimeslot.timeslot_id
        }
    })
    const timeslotsQueryData:Partial<QueryStringData> = {
        id: timeslotsIds
    }
    const timeslotsQueryString = buildQueryString(timeslotsQueryData)
    const timeslotsResponse = await getTimeslots(timeslotsQueryString)
    for (const timeslot of timeslotsResponse.data) {
        timeslotsMap[timeslot.id] = timeslot
    }

    // Link attendees and sessions
    for (const signup of signupsResponse.data) {
        const session = sessionsResponse.data.find((s) => s.id === signup.session_id)
        if (session === null || session === undefined) {
            continue
        }

        const attendee = attendeesMap[signup.attendee_id]
        if (!attendee) {
            continue
        }
        
        if (!attendeeSessionsMap[attendee.id]) {
            attendeeSessionsMap[attendee.id] = []
        }
        attendeeSessionsMap[attendee.id].push(session)
    }
    
    // Link timeslots and sessions
    for (const session of sessionsResponse.data) {
        const eventTimeslot = eventTimeslotsMap[session.event_timeslot_id]
        if (eventTimeslot === null || eventTimeslot === undefined) {
            continue
        }

        const timeslot = timeslotsMap[eventTimeslot.timeslot_id]
        if (!timeslotSessionsMap[timeslot.id]) {
            timeslotSessionsMap[timeslot.id] = []
        }
        timeslotSessionsMap[timeslot.id].push(session)
    }
}

function populateOverviewTable() {
    const tableContainer = document.querySelector('.table-responsive') as HTMLDivElement
    const table = document.getElementById('overview-table')

    if (window.innerWidth >= 600) {
        tableContainer.style.paddingLeft = '50px'
        tableContainer.style.paddingRight = '50px'
    }
    
    emptyElement(table)
    let thead = document.createElement('thead')
    let headerRow = document.createElement('tr')

    let nameTd = document.createElement('td')
    nameTd.style.fontWeight = 'bold'
    nameTd.innerHTML = 'Name'
    headerRow.appendChild(nameTd)

    for (const timeslot of Object.values(timeslotsMap)) {
        let td = document.createElement('td')
        td.style.whiteSpace = 'nowrap'
        td.style.fontWeight = 'bold'
        td.innerHTML = timeslot.name
        headerRow.appendChild(td)
    }

    thead.appendChild(headerRow)
    table.appendChild(thead)

    let tbody = document.createElement('tbody')
    tbody.classList.add('table-body')
    for (const attendee of Object.values(attendeesMap)) {
        const attendeeSessions = attendeeSessionsMap[attendee.id]

        let row = document.createElement('tr')
        let attendeeName = document.createElement('td')
        attendeeName.innerHTML = attendee.name
        row.appendChild(attendeeName)

        for (const timeslot of Object.values(timeslotsMap)) {
            const timeslotSessions = timeslotSessionsMap[timeslot.id]

            let td = document.createElement('td')
            if (!attendeeSessions || !timeslotSessions) {
                row.appendChild(td)
                continue
            }

            const timeslotSessionsSet = new Set(timeslotSessions.map(session => session.id))

            for (const session of attendeeSessions) {
                if (timeslotSessionsSet.has(session.id)) {
                    const workshop = workshopsMap[session.workshop_id]
                    if (!workshop) {
                        continue
                    }

                    td.innerHTML = workshop.name
                }
            }

            row.appendChild(td)
            

        }

        tbody.appendChild(row)
    }

    table.appendChild(tbody)
}

// Event Listener
document.addEventListener("DOMContentLoaded", () => {
    const pageContainer = document.querySelector('.container-tight')
    pageContainer.classList.remove('container-tight')
    pageContainer.classList.add('container-half-tight')
});

document.addEventListener("DOMContentLoaded", async() => {
    await loadData()
    populateOverviewTable()
});