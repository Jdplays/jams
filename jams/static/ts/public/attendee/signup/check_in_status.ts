import { getAttendeesForAccount } from "@global/endpoints";
import { Attendee } from "@global/endpoints_interfaces";
import { EventDetails, EventDetailsOptions } from "@global/event_details";
import { buildQueryString, emptyElement } from "@global/helper";
import { QueryStringData } from "@global/interfaces";

let eventDetails:EventDetails;

const eventDetailsOptions:EventDetailsOptions = {
    showEventSelection: false
}

async function setupPage() {
    const attendeeSection = document.getElementById('attendee-section') as HTMLElement
    const table = document.getElementById('attendee-table') as HTMLElement
    const continueButton = document.getElementById('continue-button') as HTMLAnchorElement
    const logoutButton = document.getElementById('logout-button') as HTMLAnchorElement


    const queryData:Partial<QueryStringData> = {
        event_id: eventDetails.eventId,
        registerable: true
    }
    const queryString = buildQueryString(queryData)
    const response = await getAttendeesForAccount(queryString)
    const attendees:Attendee[] = response.data

    let noAttendeesText = attendeeSection.querySelector('.text-warning')
    if (noAttendeesText) {
        noAttendeesText.remove()
    }

    if (attendees.length === 0) {
        table.style.display = 'none'

        noAttendeesText = document.createElement('p')
        noAttendeesText.classList.add('text-warning')
        noAttendeesText.innerHTML = 'No Attendees linked to your account are at this event!'
        attendeeSection.appendChild(noAttendeesText)

        continueButton.style.display = 'none'
        logoutButton.style.display = 'block'
    } else {
        table.style.display = 'block'

        continueButton.style.display = 'block'
        logoutButton.style.display = 'none'
    }

    populateAttendeeTable(attendees)

    const checkInCountWarning = document.getElementById('check-in-count-warning')
    if (attendees.filter(a => a.checked_in === false).length > 0) {
        checkInCountWarning.style.display = 'block'
    } else {
        checkInCountWarning.style.display = 'none'
    }

    if (attendees.filter(a => a.checked_in === false).length === attendees.length) {
        continueButton.style.display = 'none'
    } else {
        continueButton.style.display = 'block'
    }


}

function populateAttendeeTable(attendees:Attendee[]) {
    const table = document.getElementById('attendee-table') as HTMLElement
    const tBody = table.querySelector('tbody')


    let tmpTBody = document.createElement('tBody')

    for (const attendee of attendees) {
        let tr = document.createElement('tr')

        let nameCell = document.createElement('td')
        let nameText = document.createElement('p')
        nameText.innerHTML = attendee.name
        nameCell.appendChild(nameText)
        tr.appendChild(nameCell)

        let checkedInStausCell = document.createElement('td')
        let statusLabel = document.createElement('label')
        statusLabel.classList.add('form-selectgroup-item', 'mb-1')

        let statusText = document.createElement('span')
        if (attendee.checked_in) {
            statusText.innerHTML = 'Yes '
        } else {
            statusText.innerHTML = 'No '
        }
        statusLabel.appendChild(statusText)

        let statusBadge = document.createElement('span')
        statusBadge.classList.add('badge', 'ms-auto')
        if (attendee.checked_in) {
            statusBadge.style.backgroundColor = 'green'
        } else {
            statusBadge.style.backgroundColor = 'red'
        }
        statusLabel.appendChild(statusBadge)
        
        checkedInStausCell.appendChild(statusLabel)
        tr.appendChild(checkedInStausCell)

        tmpTBody.appendChild(tr)
    }

    emptyElement(tBody)
    tBody.innerHTML = tmpTBody.innerHTML
}

// Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()

    if (eventDetails.eventId === -1) {
        return
    }

    await setupPage()

    window.setInterval(() => {
        setupPage()
    }, 2000)
});