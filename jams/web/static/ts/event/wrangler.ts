import { EventDetails, EventDetailsOptions } from "@global/event_details";
import { getAttendeesSignups, getLocations, getLocationsForEvent, getSessionsForEvent, getTimeslots, getTimeslotsForEvent, getUsersField, getVolunteerSignupsForEvent, getWorkshops} from "@global/endpoints";
import { EventLocation, EventTimeslot, Session, Timeslot, Workshop, Location } from "@global/endpoints_interfaces";
import { addSpinnerToElement, buildQueryString, emptyElement, isNullEmptyOrSpaces, removeSpinnerFromElement } from "@global/helper";
import { QueryStringData } from "@global/interfaces";

let eventDetails:EventDetails;

let eventTimeslotsMap:Record<number, EventTimeslot>
let timeslots:Timeslot[]
let timeslotsMap: Record<number, Timeslot>
let timeslotOrderMap: Record<number, number> = {};

let locationsMap:Record<number, Location>

let sessionsMap:Record<number, Session>
let workshopsMap:Record<number, Workshop>

let sessionVolunteerMap:Record<number, string[]>
let sessionAttendeeCountMap: Record<number, number> = {};


function getWorkshopsInEventTimeslot(eventTimeslotId:number) {
    const workshopsInTimeslot:Record<number, Workshop> = {}
    Object.values(sessionsMap).forEach(session => {
        if (!session.publicly_visible) return
        if (session.event_timeslot_id !== eventTimeslotId) return

        if (!isNullEmptyOrSpaces(session.workshop_id)) {
            const workshop = workshopsMap[session.workshop_id]
            if (workshop) {
                workshopsInTimeslot[session.id] = workshop
            }
        }
    })

    return workshopsInTimeslot
}

function populateTimeslots() {
    const timeslotsBlockElement = document.getElementById('timeslots-block');
    if (!timeslotsBlockElement) return;

    const sortedEventTimeslots = Object.entries(eventTimeslotsMap)
        .map(([eventTimeslotIdStr, eventTimeslot]) => ({
            eventTimeslotId: Number(eventTimeslotIdStr),
            eventTimeslot,
        }))
        .sort((a, b) => {
            const aIdx = timeslotOrderMap[a.eventTimeslot.timeslot_id] ?? Number.MAX_SAFE_INTEGER
            const bIdx = timeslotOrderMap[b.eventTimeslot.timeslot_id] ?? Number.MAX_SAFE_INTEGER
            return aIdx - bIdx;
        })

    for (const { eventTimeslotId, eventTimeslot } of sortedEventTimeslots) {
        const sessionsInTimeslot = Object.values(sessionsMap).filter(session =>
            session.event_timeslot_id === eventTimeslotId &&
            session.has_workshop === true &&
            session.publicly_visible === true &&
            (session.capacity ?? 0) > 0
        )

        if (sessionsInTimeslot.length === 0) continue

        const timeslot = timeslotsMap[eventTimeslot.timeslot_id]
        if (!timeslot) continue

        // Render this timeslot
        const timeslotContainer = document.createElement('div')
        timeslotContainer.classList.add('mb-4')

        const timeslotTitle = document.createElement('h2')
        timeslotTitle.innerHTML = timeslot.name

        const timeslotPeriod = document.createElement('p')
        timeslotPeriod.classList.add('text-secondary')
        timeslotPeriod.innerHTML = timeslot.range

        const workshopCardsContainer = document.createElement('div')
        workshopCardsContainer.id = `workshop-cards-container-timeslot-${eventTimeslotId}`
        workshopCardsContainer.classList.add("row", "row-deck", "row-cards", "d-flex")

        timeslotContainer.appendChild(timeslotTitle)
        timeslotContainer.appendChild(timeslotPeriod)
        timeslotContainer.appendChild(workshopCardsContainer)

        timeslotsBlockElement.appendChild(timeslotContainer)

        populateWorkshopCards(eventTimeslotId)
    }
}

function populateWorkshopCards(eventTimeslotId:number) {
    const workshopCardsContainer = document.getElementById(`workshop-cards-container-timeslot-${eventTimeslotId}`)
    emptyElement(workshopCardsContainer)

    const workshopsInTimeslot:Record<number, Workshop> = getWorkshopsInEventTimeslot(eventTimeslotId)
   
    for (const [sessionId, workshop] of Object.entries(workshopsInTimeslot)) {

        // Base Card
        const colDiv = document.createElement('div')
        colDiv.classList.add('col-12', 'col-md-4')

        const card = document.createElement('div')
        card.classList.add('card')

        // Card Header
        const cardHeader = document.createElement('div')
        cardHeader.classList.add('card-header')

        const headerSubDiv = document.createElement('div')

        const workshopName = document.createElement('h3')
        const workshopNameText = document.createElement('span')
        workshopNameText.innerHTML = workshop.name
        workshopName.appendChild(workshopNameText)

        const workshopLocation = document.createElement('p')
        workshopLocation.classList.add('text-secondary')
        const location = locationsMap[sessionsMap[Number(sessionId)].event_location_id]
        workshopLocation.innerHTML = location.name
        headerSubDiv.appendChild(workshopName)
        headerSubDiv.appendChild(workshopLocation)

        cardHeader.appendChild(headerSubDiv)
        card.appendChild(cardHeader)

        // Card Body
        const cardBody = document.createElement('div')
        cardBody.classList.add('card-body')

        const volunteersElement = document.createElement('p')
        const volunteerString = sessionVolunteerMap[Number(sessionId)]?.join(", ") ?? "";
        volunteersElement.innerHTML = `Volunteers: ${volunteerString}`

        const attendeesElement = document.createElement('p')
        const attendeesString = `${sessionAttendeeCountMap[Number(sessionId)]}/${sessionsMap[Number(sessionId)].capacity}`;
        attendeesElement.innerHTML = `Attendees: ${attendeesString}`

        cardBody.appendChild(volunteersElement)
        cardBody.appendChild(attendeesElement)
        card.appendChild(cardBody)

        // Card Footer
        const cardFooter = document.createElement('div')
        cardFooter.classList.add('card-footer')

        let div = document.createElement('div')
        let viewButton = document.createElement('a')
        viewButton.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
        viewButton.style.marginRight = '10px'
        viewButton.innerHTML = 'View Details'
        viewButton.href = `/private/event/${eventDetails.eventId}/sessions/${sessionId}/wrangler`
        div.appendChild(viewButton)

        cardFooter.appendChild(div)
        card.appendChild(cardFooter)

        colDiv.appendChild(card)

        workshopCardsContainer.appendChild(colDiv)
    }
}

function timeslotStartKey(ts: Timeslot): number {
    const raw = (ts as any).start_time ?? (ts as any).start ?? null
    if (typeof raw === "string") {
        const ms = Date.parse(raw)
        if (!Number.isNaN(ms)) return ms

        const hm = raw.match(/^(\d{1,2}):(\d{2})$/)
        if (hm) return Number(hm[1]) * 60 + Number(hm[2])
    }

    if (typeof (ts as any).range === "string") {
        const m = (ts as any).range.match(/^(\d{1,2}):(\d{2})/)
        if (m) return Number(m[1]) * 60 + Number(m[2])
    }

    return Number.POSITIVE_INFINITY
}

function buildTimeslotOrderMap() {
    const sorted = [...timeslots].sort((a, b) => timeslotStartKey(a) - timeslotStartKey(b))
    timeslotOrderMap = Object.fromEntries(sorted.map((ts, idx) => [ts.id, idx]))
}

// Load Data
async function loadTimeslots() {
    const eventTimeslotsQueryData:Partial<QueryStringData> = {
        publicly_visible: true
    }
    const eventTimeslotsQueryString = buildQueryString(eventTimeslotsQueryData)
    const eventTimeslots = await getTimeslotsForEvent(eventDetails.eventId, eventTimeslotsQueryString)
    
    let _eventTimeslotsMap:Record<number, EventTimeslot> = {}
    eventTimeslots.forEach(et => {
        _eventTimeslotsMap[et.id] = et
    })
    eventTimeslotsMap = _eventTimeslotsMap

    const eventTimeslotIds = eventTimeslots.map(et => et.timeslot_id)

    const timeslotsQueryData:Partial<QueryStringData> = {
        id: eventTimeslotIds
    }
    const timeslotsQueryString = buildQueryString(timeslotsQueryData)
    const timeslotsResponse = await getTimeslots(timeslotsQueryString)

    let _timeslots:Timeslot[] = [];

    eventTimeslots.forEach(et => {
        const timeslot = timeslotsResponse.data.filter(ts => ts.id === et.timeslot_id)[0]
        _timeslots.push(timeslot)
    })

    _timeslots.sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    );

   timeslots = _timeslots

    let _timeslotsMap: Record<number, Timeslot> = {}

    for (const timeslot of timeslots) {
        _timeslotsMap[timeslot.id] = timeslot
    }

    timeslotsMap = _timeslotsMap
}

async function loadLocations() {
    const eventLocationsQueryData:Partial<QueryStringData> = {
        publicly_visible: true
    }
    const eventLocationsQueryString = buildQueryString(eventLocationsQueryData)
    const eventLocations = await getLocationsForEvent(eventDetails.eventId, eventLocationsQueryString)
    
    let _eventLocationsMap:Record<number, EventLocation> = {}
    eventLocations.forEach(et => {
        _eventLocationsMap[et.id] = et
    })

    const eventLocationIds = eventLocations.map(et => et.location_id)

    const locationsQueryData:Partial<QueryStringData> = {
        id: eventLocationIds
    }
    const locationsQueryString = buildQueryString(locationsQueryData)
    const locationsResponse = await getLocations(locationsQueryString)

    let _locationsMap:Record<number, Location> = {};

    eventLocations.forEach(el => {
        const loc = locationsResponse.data.filter(loc => loc.id === el.location_id)[0]
        _locationsMap[el.id] = loc
    })

   locationsMap = _locationsMap
}

async function loadSessionsMap() {
    const queryData = {
        '$all_rows': true
    }
    const queryString = buildQueryString(queryData)
    const sessionsResponse = await getSessionsForEvent(eventDetails.eventId, queryString)

    let _sessionsMap:Record<number, Session> = {}

    sessionsResponse.data.forEach(session => {
        _sessionsMap[session.id] = session
    })

    sessionsMap = _sessionsMap
}

async function loadWorkshopsMap() {
    const workshopIds = Object.values(sessionsMap).map(session => {
        if (session.has_workshop) {
            return session.workshop_id
        }
    })

    const queryData:Partial<QueryStringData> = {
        '$all_rows': true,
        id: workshopIds
    }
    const queryString = buildQueryString(queryData)
    const workshopsResponse = await getWorkshops(queryString)

    let _workshopsMap:Record<number, Workshop> = {}

    workshopsResponse.data.forEach(workshop => {
        _workshopsMap[workshop.id] = workshop
    })

    workshopsMap = _workshopsMap
}

async function loadVolunteerNamesPerSession() {
    const sessionIds = Object.keys(sessionsMap).map(id => Number(id))
    const volunteerSignupsQueryData:Partial<QueryStringData> = {
        '$all_rows': true,
        session_id: sessionIds
    }
    const volunteerSignupsQueryString = buildQueryString(volunteerSignupsQueryData)
    const volunteerSignupsResponse = await getVolunteerSignupsForEvent(eventDetails.eventId, volunteerSignupsQueryString)

    const volunteerSignups = volunteerSignupsResponse.data;

    const volunteerIds = volunteerSignupsResponse.data.map(user => user.user_id)

    const userQueryData:Partial<QueryStringData> = {
        '$all_rows': true,
        id: volunteerIds
    }
    const userQueryString = buildQueryString(userQueryData)
    const userResponse = await getUsersField("display_name", userQueryString)

    const users = userResponse.data

    const userMap = new Map<number, string>()
    for (const user of users) {
        if (user.id && user.display_name) {
            userMap.set(user.id, user.display_name)
        }
    }

    const _sessionVolunteerMap: Record<number, string[]> = {}
    for (const signup of volunteerSignups) {
        const displayName = userMap.get(signup.user_id);
        if (!displayName) continue;

        const sessionId = signup.session_id;
        (_sessionVolunteerMap[sessionId] ??= []).push(displayName);
    }

    sessionVolunteerMap = _sessionVolunteerMap
}

async function loadAttendeeCountsPerSession() {
    const sessionIds = Object.keys(sessionsMap).map(id => Number(id))
    const attendeeSignupsQueryData:Partial<QueryStringData> = {
        '$all_rows': true,
        event_id: eventDetails.eventId,
        session_id: sessionIds
    }
    const attendeeSignupsQueryString = buildQueryString(attendeeSignupsQueryData)
    const attendeeSignupsResponse = await getAttendeesSignups(attendeeSignupsQueryString)

    const attendeeSignups = attendeeSignupsResponse.data;

    const _sessionAttendeeCountMap: Record<number, number> = {};

    for (const id of sessionIds) {
        _sessionAttendeeCountMap[id] = 0;
    }

    for(const signup of attendeeSignups) {
        const sessionId = signup.session_id

        _sessionAttendeeCountMap[sessionId] = (_sessionAttendeeCountMap[sessionId] ?? 0) + 1
    }

    sessionAttendeeCountMap = _sessionAttendeeCountMap
}

async function loadWranglerPageForEvent() {
    const timeslotsBlockElement = document.getElementById('timeslots-block')
    emptyElement(timeslotsBlockElement)
    addSpinnerToElement(timeslotsBlockElement)

    await Promise.all([
        loadTimeslots(),
        loadLocations(),
        loadSessionsMap(),
    ])

    await Promise.all([
        loadWorkshopsMap(),
        loadVolunteerNamesPerSession(),
        loadAttendeeCountsPerSession(),
    ])

    buildTimeslotOrderMap()
    populateTimeslots()
    removeSpinnerFromElement(timeslotsBlockElement)
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search)
    const paramsEventId = Number(params.get("event_id"))
    const eventDetailsOptions:EventDetailsOptions = {
        dateInclusive: true,
        eventOnChangeFunc: async () => {
            await loadWranglerPageForEvent()
        }
    }

    if (paramsEventId !== null && paramsEventId !== 0) {
        eventDetailsOptions.eventId = paramsEventId
    }
    
    // Clear Query Parameters
    window.history.replaceState({}, document.title, window.location.pathname);

    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()

    if (eventDetails.eventId === -1) {
        return
    }

    await loadWranglerPageForEvent()
});