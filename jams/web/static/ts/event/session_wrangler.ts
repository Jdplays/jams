import { EventDetails, EventDetailsOptions } from "@global/event_details";
import { getAttendanceForEvent, getAttendee, getAttendees, getAttendeesSignups, getLocationForSession, getLocations, getLocationsForEvent, getSessionsForEvent, getTimeslotForSession, getTimeslots, getTimeslotsForEvent, getUsersField, getVolunteerSignupsForEvent, getWorkshop, getWorkshopForSession, getWorkshops} from "@global/endpoints";
import { EventLocation, EventTimeslot, Session, Timeslot, Workshop, Location, Attendee, VolunteerSignup } from "@global/endpoints_interfaces";
import { addSpinnerToElement, buildQueryString, emptyElement, isNullEmptyOrSpaces, removeSpinnerFromElement } from "@global/helper";
import { QueryStringData } from "@global/interfaces";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let eventDetails:EventDetails;
let attendeesGridApi: GridApi<any>;

let eventId:number
let sessionId:number

let timeslot:Timeslot
let location:Location
let workshop:Workshop

let sessionVolunteers:string[]
let sessionAttendees: Attendee[]

function initialiseAttendeesAgGrid() {
    const gridOptions:GridOptions = {
        domLayout: "autoHeight",
        suppressMovableColumns: true,
        columnDefs: [
            {
                field: 'name',
                maxWidth:120,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                pinned: true,
                flex: 1
            },
            {field: 'email', minWidth:250, tooltipValueGetter: (params:any) => params.value, flex: 1},
            {field: 'age', minWidth:70, flex: 1},
            {field: 'gender', minWidth:120, flex: 1},
        ]
    }

    const gridElement = document.getElementById('attendees-data-grid') as HTMLElement
    attendeesGridApi = createGrid(gridElement, gridOptions)

    populateAttendeesTable()
}

async function populateAttendeesTable() {
    await loadAttendeeDataForSignups()
    attendeesGridApi.setGridOption('rowData', sessionAttendees)
}

// Load Data
async function loadVolunteerNamesForSession(): Promise<string[]> {
    const volunteerSignupsQueryData: Partial<QueryStringData> = {
        '$all_rows': true,
        session_id: sessionId
    }

    const volunteerSignupsQueryString = buildQueryString(volunteerSignupsQueryData)

    const volunteerSignupsResponse = await getVolunteerSignupsForEvent(eventDetails.eventId, volunteerSignupsQueryString)
    const volunteerSignups = volunteerSignupsResponse.data as VolunteerSignup[];

    if (volunteerSignups.length === 0) {
        return []
    }

    const volunteerIds = [...new Set(
        volunteerSignups.map((v: any) => v.user_id)
    )]

    const userQueryData: Partial<QueryStringData> = {
        '$all_rows': true,
        id: volunteerIds
    }

    const userQueryString = buildQueryString(userQueryData)

    const userResponse = await getUsersField("display_name", userQueryString)

    const users = userResponse.data

    sessionVolunteers = users
        .filter((u: any) => u.display_name)
        .map((u: any) => u.display_name)
        .sort((a: string, b: string) => a.localeCompare(b))
}

async function loadAttendeeDataForSignups() {
    const queryData:Partial<QueryStringData> = {
        '$all_rows': true,
        session_id: sessionId,
        event_id: eventDetails.eventId
    }
    const queryString = buildQueryString(queryData)
    const attendeeSignupsResponse = await getAttendeesSignups(queryString)

    const signups = attendeeSignupsResponse.data
    const attendeeIds = [...new Set(signups.map((s: any) => s.attendee_id))]

    if (attendeeIds.length === 0) {
        sessionAttendees = []
        return
    }

    const attendeeQueryData:Partial<QueryStringData> = {
        '$all_rows': true,
        id: attendeeIds,
    }
    const attendeeQueryString = buildQueryString(attendeeQueryData)

    const attendeesResponse = await getAttendees(eventDetails.eventId, attendeeQueryString)
    sessionAttendees = attendeesResponse.data
}

async function loadPage() {
    const results = await Promise.allSettled([
        getWorkshopForSession(sessionId),
        getLocationForSession(sessionId),
        getTimeslotForSession(sessionId),
    ]);

    workshop = results[0].status === "fulfilled" ? results[0].value : null;
    location = results[1].status === "fulfilled" ? results[1].value : null;
    timeslot = results[2].status === "fulfilled" ? results[2].value : null;

    await loadVolunteerNamesForSession()
    initialiseAttendeesAgGrid()
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
    const pagePath = window.location.pathname
    const pathParts = pagePath.split('/')
    eventId = Number(pathParts[pathParts.length - 4])
    sessionId = Number(pathParts[pathParts.length - 2])

    const backButton = document.getElementById('back-to-wrangler-page') as HTMLAnchorElement
    backButton.href = `/private/event/wrangler?event_id=${eventId}`

    const eventDetailsOptions:EventDetailsOptions = {
        eventId: eventId,
        showEventSelection: false
    }

    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await Promise.all([
      eventDetails.init(),
      loadPage()
    ])

    if (eventDetails.eventId === -1) {
        return
    }

    const pageTitle = document.getElementById('session-wrangler-title')
    const workshopDescription = document.getElementById('workshop-description')
    const workshopTimeRange = document.getElementById('workshop-time')

    pageTitle.innerHTML = workshop.name
    workshopDescription.innerHTML = workshop.description
    workshopTimeRange.innerHTML = timeslot.range

    const volunteerNamesElement = document.getElementById('volunteer-names')
    const volunteers = sessionVolunteers ?? [];
    volunteerNamesElement.innerHTML =
        volunteers.length > 0
            ? volunteers.join(", ")
            : "None"
});