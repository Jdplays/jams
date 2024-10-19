import { addAttendeeSignup, getAttendeesForAccount, getAttendeesSignupsForAccount, getDifficultyLevels, getLocations, getLocationsForEvent, getSessionsForEvent, getTimeslots, getTimeslotsForEvent, getWorkshops, getWorkshopTypes, removeAttendeeSignup } from "@global/endpoints";
import { Attendee, DifficultyLevel, EventLocation, EventTimeslot, Session, Timeslot, Workshop, WorkshopType, Location, AttendeeSignup } from "@global/endpoints_interfaces";
import { EventDetails, EventDetailsOptions } from "@global/event_details";
import { addSpinnerToElement, buildQueryString, emptyElement, errorToast, isDefined, isNullEmptyOrSpaces, removeSpinnerFromElement, successToast } from "@global/helper";
import { QueryStringData } from "@global/interfaces";

let eventDetails:EventDetails;

const eventDetailsOptions:EventDetailsOptions = {
    showEventSelection: false
}
let eventTimeslotsMap:Record<number, EventTimeslot>
let timeslots:Timeslot[]
let currentTimeslotId:number;

let locationsMap:Record<number, Location>

let sessionsMap:Record<number, Session>
let workshopsMap:Record<number, Workshop>
let difficultyLevelsMap:Record<number, DifficultyLevel>
let workshopTypesMap:Record<number, WorkshopType>

let attendeesMap:Record<number, Attendee>
let attendeeSignupMap:Record<number, AttendeeSignup>

function populateTimeslostStepElement() {
    const timeslotNameText = document.getElementById('timeslot-name')
    const stepElement = document.getElementById('timeslost-steps')
    emptyElement(stepElement)

    for (const timeslot of timeslots) {
        let li = document.createElement('li')
        li.classList.add('step-item')

        let timeslotName = document.createElement('div')
        timeslotName.classList.add('h4', 'm-0')
        timeslotName.innerHTML = timeslot.name

        let timeslotRange = document.createElement('div')
        timeslotRange.classList.add('text-secondary')
        timeslotRange.innerHTML = timeslot.range

        li.appendChild(timeslotName)
        li.appendChild(timeslotRange)

        if (timeslot.id === currentTimeslotId) {
            li.classList.add('active')
            timeslotNameText.innerHTML = timeslot.name
        } else {
            li.classList.remove('active')
        }

        stepElement.appendChild(li)
    }
}

function getWorkshopsInCurrentTimeslot() {
    const timeslotIds = timeslots.map(ts => ts.id)

    const workshopsInTimeslot:Record<number, Workshop> = {}
    Object.values(sessionsMap).forEach(session => {
        if (!session.publicly_visible) {
            return
        }
        if (Object.keys(eventTimeslotsMap).includes(String(session.event_timeslot_id))) {
            const eventTimeslot = eventTimeslotsMap[session.event_timeslot_id]
            if (currentTimeslotId === timeslots[timeslotIds.indexOf(eventTimeslot.timeslot_id)].id) {
                if (!isNullEmptyOrSpaces(session.workshop_id)) {
                    workshopsInTimeslot[session.id] = workshopsMap[session.workshop_id]
                }
            }
        }
    })

    return workshopsInTimeslot
}

function populateWorkshopCards() {
    const workshopCardsContainer = document.getElementById('workshop-cards-container')
    emptyElement(workshopCardsContainer)

    const workshopsInTimeslot:Record<number, Workshop> = getWorkshopsInCurrentTimeslot()
   
    for (const [sessionId, workshop] of Object.entries(workshopsInTimeslot)) {
        let difficultyLevel:DifficultyLevel
        if (!isNullEmptyOrSpaces(workshop.difficulty_id)) {
            difficultyLevel = difficultyLevelsMap[workshop.difficulty_id]
        }

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
        workshopName.innerHTML = workshop.name
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

        const workshopDescription = document.createElement('p')
        workshopDescription.innerHTML = workshop.description

        cardBody.appendChild(workshopDescription)
        card.appendChild(cardBody)

        // Card Footer
        const cardFooter = document.createElement('div')
        cardFooter.classList.add('card-footer')

        const footerSubDiv = document.createElement('div')
        footerSubDiv.classList.add('d-flex')

        if (!isNullEmptyOrSpaces(workshop.difficulty_id)) {
            const difficultyTag = document.createElement('span')
            difficultyTag.classList.add('form-selectgroup-label')
            difficultyTag.innerHTML = `${difficultyLevel.name} `

            const difficultyTagSubSpan = document.createElement('span')
            difficultyTagSubSpan.classList.add('badge', 'ms-auto')
            difficultyTagSubSpan.style.backgroundColor = difficultyLevel.display_colour

            difficultyTag.appendChild(difficultyTagSubSpan)
            footerSubDiv.appendChild(difficultyTag)
        } else {
            const workshopTypeTag = document.createElement('span')
            workshopTypeTag.classList.add('form-selectgroup-label')
            workshopTypeTag.innerHTML = workshopTypesMap[workshop.workshop_type_id].name

            footerSubDiv.appendChild(workshopTypeTag)
        }

        if (workshop.attendee_registration) {
            const sessionAttendance = document.createElement('p')
            sessionAttendance.classList.add('ms-auto')
            sessionAttendance.id = `session-attendance-${sessionId}`
            sessionAttendance.innerHTML = '5/10'

            footerSubDiv.appendChild(sessionAttendance)
        }
        cardFooter.appendChild(footerSubDiv)
        card.appendChild(cardFooter)

        colDiv.appendChild(card)

        workshopCardsContainer.appendChild(colDiv)
    }
}

function buildWorkshopSelectionGroup(attendeeId:number, wsMap:Record<number, Workshop>) {
    const container = document.createElement('div')
    container.id = `attendee-${attendeeId}-workshop-selection-container`
    container.classList.add('form-selectgroup')

    for (const [sessionId, workshop] of Object.entries(wsMap)) {
        if (workshop.attendee_registration) {
            const label = document.createElement('label')
            label.id = `session-${sessionId}`
            label.classList.add('form-selectgroup-item')

            const input = document.createElement('input') as HTMLInputElement
            input.classList.add('form-selectgroup-input')
            input.type = 'radio'
            input.name = `attendee-${attendeeId}-workshop-selection`
            input.value = sessionId
            input.setAttribute('session-id', sessionId)
            label.appendChild(input)

            const span = document.createElement('span')
            span.classList.add('form-selectgroup-label')
            span.innerHTML = `${workshop.name} (5/10)`
            label.appendChild(span)

            container.appendChild(label)
        }
    }

    container.onchange = (event) => {
        const selectedInput = event.target as HTMLInputElement
        const sessionId = selectedInput.value

        const uncheckedInputs = Array.from(container.querySelectorAll('input.form-selectgroup-input')).filter((input) => {
            return !(input as HTMLInputElement).checked
        }) as HTMLInputElement[]

        const data: Partial<AttendeeSignup> = {
            event_id: eventDetails.eventId
        }

        if (selectedInput.checked) {
            data.session_id = Number(sessionId)
            addAttendeeSignup(attendeeId, data).then((response) => {
                successToast(response.message)
                loadAttendeeSignupData()
            }).catch((error) => {
                const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
                errorToast(errorMessage)
            })
        }
        
        for (const input of uncheckedInputs) {
            const sessionId = input.getAttribute('session-id')

            if (Object.keys(sessionsMap).includes(sessionId)) {
                removeAttendeeSignup(attendeeId, Number(sessionId), data).then((response) => {
                    successToast(response.message)
                    loadAttendeeSignupData()
                }).catch((error) => {
                    const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
                    errorToast(errorMessage)
                })
            }
        }
    }

    return container
}

function populateAttendeesTable() {
    const attendeeSection = document.getElementById('attendee-section')
    const attendeeTable = document.getElementById('attendee-table')
    const attendeeTableBody = document.getElementById('attendee-table-body')
    emptyElement(attendeeTableBody)

    const workshopsInTimeslot:Record<number, Workshop> = getWorkshopsInCurrentTimeslot()

    if (Object.values(workshopsInTimeslot).filter(ws => ws.attendee_registration).length === 0) {
        attendeeTable.style.display = 'none'

        const ids = timeslots.map(ts => ts.id)
        let timeslot = timeslots.filter(ts => ts.id === (timeslots[ids.indexOf(currentTimeslotId) + 1]).id)[0]
        const registerWarningText = document.createElement('p')
        registerWarningText.classList.add('text-warning')
        registerWarningText.innerHTML = `Note: None of the workshops in ${timeslot.name} are registerable. This means they are open to everyone. You can continue to the next timeslot.`

        attendeeSection.appendChild(registerWarningText)
        return
    } else {
        attendeeTable.style.display = 'block'

        const registerWarningText = attendeeSection.querySelector('.text-warning')
        if (registerWarningText) {
            registerWarningText.remove()
        }
    }

    for (const attendee of Object.values(attendeesMap)) {
        const row = document.createElement('tr')

        const nameCell = document.createElement('td')
        const attendeeName = document.createElement('p')
        attendeeName.innerHTML = attendee.name

        nameCell.appendChild(attendeeName)
        row.appendChild(nameCell)

        const workshopSelectionCell = document.createElement('td')
        const workshopSelectionGroup = buildWorkshopSelectionGroup(attendee.id, workshopsInTimeslot)
        workshopSelectionCell.appendChild(workshopSelectionGroup)
        row.appendChild(workshopSelectionCell)

        attendeeTableBody.appendChild(row)
    }
}

function populateAttendeeSignupData() {
    const timeslotIds = timeslots.map(ts => ts.id)
    const workshopSessionsInTimeslot:number[] = []
    Object.values(sessionsMap).forEach(session => {
        if (!session.publicly_visible) {
            return
        }

        if (!session.has_workshop) {
            return
        }

        const eventTimeslot = eventTimeslotsMap[session.event_timeslot_id]
        if (currentTimeslotId === timeslots[timeslotIds.indexOf(eventTimeslot.timeslot_id)].id) {
            workshopSessionsInTimeslot.push(session.id)
        }
    })

    for (const sessionId of workshopSessionsInTimeslot) {
        const signupCount = Object.values(attendeeSignupMap).filter(signup => signup.session_id === sessionId).length
        const workshop = workshopsMap[sessionsMap[sessionId].workshop_id]

        const wsCardAttendance = document.getElementById(`session-attendance-${sessionId}`)
        if (wsCardAttendance) {
            wsCardAttendance.innerHTML = `${signupCount}/${workshop.capacity}`
            if (signupCount >= workshop.capacity) {
                wsCardAttendance.classList.add('text-danger')
            } else {
                wsCardAttendance.classList.remove('text-danger')
            }
        }
    }

    for (const attendee of Object.values(attendeesMap)) {
        const attendeeWorkshopSelectionContainer = document.getElementById(`attendee-${attendee.id}-workshop-selection-container`)

        if (!attendeeWorkshopSelectionContainer) {
            continue
        }

        for (const sessionId of workshopSessionsInTimeslot) {
            const sessionSelectionLabel = attendeeWorkshopSelectionContainer.querySelector(`#session-${sessionId}`)
            if (!sessionSelectionLabel) {
                continue
            }

            const input = sessionSelectionLabel.querySelector('input') as HTMLInputElement
            const text = sessionSelectionLabel.querySelector('span')

            const signupCount = Object.values(attendeeSignupMap).filter(signup => signup.session_id === sessionId).length
            const workshop = workshopsMap[sessionsMap[sessionId].workshop_id]

            if (signupCount >= workshop.capacity) {
                text.classList.add('text-danger')
                input.disabled = true
            } else {
                text.classList.remove('text-danger')
                input.disabled = false
            }

            if (Object.values(attendeeSignupMap).filter(signup => signup.attendee_id === attendee.id && signup.session_id === sessionId).length > 0) {
                input.checked = true
                text.classList.remove('text-danger')
                text.classList.add('text-success')
            } else {
                input.checked = false
                text.classList.remove('text-success')
            }

            text.innerHTML = `${workshop.name} (${signupCount}/${workshop.capacity})`

        }

    }
}

function populatePrevNextButtons() {
    const ids = timeslots.map(ts => ts.id)
    const currentIndex = ids.indexOf(currentTimeslotId)

    const nextButton = document.getElementById('next-timeslot-button') as HTMLButtonElement
    const nextText = nextButton.querySelector('.btn-text')
    if (currentIndex + 1 > ids.length - 1) {
        nextText.innerHTML = 'Finish'
        nextButton.onclick = () => {
        }
    } else {
        let timeslot = timeslots.filter(ts => ts.id === (timeslots[ids.indexOf(currentTimeslotId) + 1]).id)[0]
        nextText.innerHTML = timeslot.name
        nextButton.onclick = nextTimeslotOnClick
    }

    const prevButton = document.getElementById('prev-timeslot-button') as HTMLButtonElement
    const prevText = prevButton.querySelector('.btn-text')
    if (currentIndex - 1 < 0) {
        prevText.innerHTML = 'Back'
        prevButton.onclick = () => {
            window.location.replace('/attendee/signup')
        }
    } else {
        let timeslot = timeslots.filter(ts => ts.id === (timeslots[ids.indexOf(currentTimeslotId) - 1]).id)[0]
        prevText.innerHTML = timeslot.name
        prevButton.onclick = prevTimeslotOnClick
    }
}

function nextTimeslotOnClick() {
    const ids = timeslots.map(ts => ts.id)
    const currentIndex = ids.indexOf(currentTimeslotId)

    if (currentIndex !== -1 && currentIndex < ids.length - 1) {
        currentTimeslotId = ids[currentIndex + 1]

        populatePrevNextButtons()
    }

    populateTimeslostStepElement()
    populateWorkshopCards()
    populateAttendeesTable()
    populateAttendeeSignupData()

    window.scrollTo(0, 0)
}

function prevTimeslotOnClick() {
    const ids = timeslots.map(ts => ts.id)
    const currentIndex = ids.indexOf(currentTimeslotId)

    if (currentIndex > 0) {
        currentTimeslotId = ids[currentIndex - 1]
        
        populatePrevNextButtons()
    }

    populateTimeslostStepElement()
    populateWorkshopCards()
    populateAttendeesTable()
    populateAttendeeSignupData()

    window.scrollTo(0, 0)
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

   timeslots = _timeslots
}

async function loadLocations() {
    const eventlocationsQueryData:Partial<QueryStringData> = {
        publicly_visible: true
    }
    const eventlocationsQueryString = buildQueryString(eventlocationsQueryData)
    const eventlocations = await getLocationsForEvent(eventDetails.eventId, eventlocationsQueryString)
    
    let _eventLocationsMap:Record<number, EventLocation> = {}
    eventlocations.forEach(et => {
        _eventLocationsMap[et.id] = et
    })

    const eventlocationIds = eventlocations.map(et => et.location_id)

    const locationsQueryData:Partial<QueryStringData> = {
        id: eventlocationIds
    }
    const locationsQueryString = buildQueryString(locationsQueryData)
    const locationsResponse = await getLocations(locationsQueryString)

    let _locationsMap:Record<number, Location> = {};

    eventlocations.forEach(el => {
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

async function loadDifficultyLevelsMap() {
    const difficultyLevelIds = Object.values(workshopsMap).map(workshop => {
        if (!isNullEmptyOrSpaces(workshop.difficulty_id)) {
            return workshop.difficulty_id
        }
    })
    
    const queryData:Partial<QueryStringData> = {
        '$all_rows': true,
        id: difficultyLevelIds
    }
    const queryString = buildQueryString(queryData)
    const difficultyLevelsResponse = await getDifficultyLevels(queryString)

    let _difficultyLevelsMap:Record<number, DifficultyLevel> = {}

    difficultyLevelsResponse.data.forEach(level => {
        _difficultyLevelsMap[level.id] = level
    })

    difficultyLevelsMap = _difficultyLevelsMap
}

async function loadWorkshopTypesMap() {
    const workshopTypeIds = Object.values(workshopsMap).map(workshop => workshop.workshop_type_id)
    
    const queryData:Partial<QueryStringData> = {
        '$all_rows': true,
        id: workshopTypeIds
    }
    const queryString = buildQueryString(queryData)
    const workshopTypesResponse = await getWorkshopTypes(queryString)

    let _workshopTypesMap:Record<number, WorkshopType> = {}

    workshopTypesResponse.data.forEach(type => {
        _workshopTypesMap[type.id] = type
    })

    workshopTypesMap = _workshopTypesMap
}

async function loadAttendeesMap() {
    const queryData:Partial<QueryStringData> = {
        event_id: eventDetails.eventId,
        checked_in: true
    }
    const queryString = buildQueryString(queryData)
    const attendeesResponse = await getAttendeesForAccount(queryString)

    let _attendeesMap:Record<number, Attendee> = {}
    
    attendeesResponse.data.forEach(attendee => {
        _attendeesMap[attendee.id] = attendee
    })

    attendeesMap = _attendeesMap
}

async function loadAttendeeSignupMap() {
    const queryData:Partial<QueryStringData> = {
        event_id: eventDetails.eventId,
        attendee_id: Object.keys(attendeesMap).map(id => Number(id))
    }
    const queryString = buildQueryString(queryData)
    const attendeeSignupResponse = await getAttendeesSignupsForAccount(queryString)

    let _attendeeSignupMap:Record<number, AttendeeSignup> = {}

    attendeeSignupResponse.data.forEach(signup => {
        _attendeeSignupMap[signup.id] = signup
    })

    attendeeSignupMap = _attendeeSignupMap
}

// Section Loaders
async function loadStepsSection() {
    const stepElement = document.getElementById('timeslost-steps')

    addSpinnerToElement(stepElement)
    await loadTimeslots()
    currentTimeslotId = timeslots[0].id

    populateTimeslostStepElement()
    populatePrevNextButtons()
    removeSpinnerFromElement(stepElement)
}

async function loadWorkshopsSection() {
    const workshopCardsContainer = document.getElementById('workshop-cards-container')

    addSpinnerToElement(workshopCardsContainer)
    await loadLocations()
    await loadSessionsMap()
    await loadWorkshopsMap()
    await loadDifficultyLevelsMap()
    await loadWorkshopTypesMap()

    populateWorkshopCards()
    removeSpinnerFromElement(workshopCardsContainer)
}

async function loadAttendeeSection() {
    const attendeeSection = document.getElementById('attendee-section')
    const attendeeTable = document.getElementById('attendee-table')

    attendeeTable.style.display = 'none'
    addSpinnerToElement(attendeeSection)
    await loadAttendeesMap()

    populateAttendeesTable()
    removeSpinnerFromElement(attendeeSection)
    attendeeTable.style.display = 'block'
}

async function loadAttendeeSignupData() {
    await loadAttendeeSignupMap()
    populateAttendeeSignupData()
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    const pageContainer = document.querySelector('.container-tight')
    pageContainer.classList.remove('container-tight')
    pageContainer.classList.add('container')
});

document.addEventListener("DOMContentLoaded", async () => {
    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()

    if (eventDetails.eventId === -1) {
        return
    }

    // Load Sections

    // Steps
    loadStepsSection()

    // Workshop Cards
    await loadWorkshopsSection()

    // Attendee Assignment
    await loadAttendeeSection()

    // Attendee Signup Data
    loadAttendeeSignupData
});

document.addEventListener("DOMContentLoaded", () => {
    window.setInterval(async () => {
        loadAttendeeSignupData()
    }, 1000)
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).nextTimeslotOnClick = nextTimeslotOnClick;
        (<any>window).prevTimeslotOnClick = prevTimeslotOnClick;
    }
});