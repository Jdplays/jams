var EVENTID = 1
var LocationsLength = 0

function GetEventNames() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/name',
            type: 'GET',
            success: function(response) {
                resolve(response.events)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function GetEvent(eventID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/' + eventID,
            type: 'GET',
            success: function(response) {
                resolve(response)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        })
    })
}

function GetLocationsForEvent(eventID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/' + eventID + '/locations',
            type: 'GET',
            success: function(response) {
                resolve(response.event_locations)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function GetTimeslotsForEvent(eventID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/' + eventID + '/timeslots',
            type: 'GET',
            success: function(response) {
                resolve(response.event_timeslots)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetSessionsForEvent(eventID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/' + eventID + '/sessions',
            type: 'GET',
            success: function(response) {
                resolve(response.sessions)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetWorkshopForSession(sessionID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/sessions/' + sessionID + '/workshop',
            type: 'GET',
            success: function(response) {
                resolve(response.workshop)
            },
            error: function(error, response) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetLocation(locationID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/locations/' + locationID,
            type: 'GET',
            success: function(response) {
                resolve(response)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetTimeslot(timeslotID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/timeslots/' + timeslotID,
            type: 'GET',
            success: function(response) {
                resolve(response)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetWorkshop(workshopID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/workshops/' + workshopID,
            type: 'GET',
            success: function(response) {
                resolve(response)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetLocationNames() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/locations/name',
            type: 'GET',
            success: function(response) {
                resolve(response.locations)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetTimeslotNames() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/timeslots/name',
            type: 'GET',
            success: function(response) {
                resolve(response.timeslots)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetWorkshopNames(queryString=null) {
    return new Promise((resolve, reject) => {
        url = "/backend/workshops/name"
        if (queryString != null) {
            url = url + '?name=' + queryString
        }
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                resolve(response.workshops)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}


function AddLocationToEvent(eventID, location_id, order) {
    const data = {
        'location_id': location_id,
        'order': order
    }

    $.ajax({
        url: '/backend/events/' + eventID + '/locations',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            BuildSchedule()
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function AddTimeslotToEvent(eventID, timeslot_id) {
    const data = {
        'timeslot_id': timeslot_id
    }

    $.ajax({
        url: '/backend/events/' + eventID + '/timeslots',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            BuildSchedule()
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function AddWorkshopToSession(sessionID, workshopID) {
    const data = {
        'workshop_id': workshopID,
    }

    $.ajax({
        url: '/backend/sessions/' + sessionID + '/workshop',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            BuildSchedule()
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function RemoveWorkshopFromSession(sessionID) {
    $.ajax({
        url: '/backend/sessions/' + sessionID + '/workshop',
        type: 'DELETE',
        success: function(response) {
            BuildSchedule()
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function RemoveLocationFromEvent(eventID, eventLocationID) {
    $.ajax({
        url: '/backend/events/' + eventID + '/locations/' + eventLocationID,
        type: 'DELETE',
        success: function(response) {
            BuildSchedule()
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function RemoveTimeslotFromEvent(eventID, eventTimeslotID) {
    $.ajax({
        url: '/backend/events/' + eventID + '/timeslots/' + eventTimeslotID,
        type: 'DELETE',
        success: function(response) {
            BuildSchedule()
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}


function EventSelectionDropdownOnChange(event) {
    const selectedValue = event.target.value
    EVENTID = selectedValue
    GetEvent(EVENTID)
    BuildSchedule()
}

function LocationsDropdownOnChange(event) {
    const selectedValue = event.target.value
    AddLocationToEvent(EVENTID, selectedValue, LocationsLength)
}

function TimeslotsDropdownOnChange(event) {
    const selectedValue = event.target.value
    AddTimeslotToEvent(EVENTID, selectedValue, LocationsLength)
}

function WorkshopDropdownOnChange(sessionID, workshopID) {
    AddWorkshopToSession(sessionID, workshopID)
}

function WorkshopSearchOnChange() {
    PopulateWorkshopSidebarList()
}

function CreateDropdown(options, defualtOptionText, onChangeFunc) {
    const select = document.createElement('select')
    const defaultOptionsElement = document.createElement('option');
    defaultOptionsElement.innerText = defualtOptionText
    defaultOptionsElement.disabled = true;
    defaultOptionsElement.selected = true;
    defaultOptionsElement.hidden = true;
    select.appendChild(defaultOptionsElement)
    for (const option of options) {
        const optionElement = document.createElement('option');
        optionElement.value = option.id;
        optionElement.innerText = option.name;
        select.appendChild(optionElement);
    }

    select.onchange = onChangeFunc

    return select
}

function CreateWorkshopDropdown(options, sessionID) {
    const select = document.createElement('select')
    const defaultOptionsElement = document.createElement('option');
    defaultOptionsElement.innerText = "Add Workshop"
    defaultOptionsElement.disabled = true;
    defaultOptionsElement.selected = true;
    defaultOptionsElement.hidden = true;
    select.appendChild(defaultOptionsElement)
    for (const option of options) {
        const optionElement = document.createElement('option');
        optionElement.value = option.id;
        optionElement.innerText = option.name;
        select.appendChild(optionElement);
    }

    select.onchange = function() {
        WorkshopDropdownOnChange(sessionID, this.value)
    }

    return select
}

async function PopulateEventSelectionDropdown() {
    let events = await GetEventNames()

    eventSelectionDropdown = document.getElementById('event-selection')
    eventSelectionDropdown.appendChild(CreateDropdown(await events, await events[0].name, EventSelectionDropdownOnChange))
} 

async function PopulateEventName() {
    let event = await GetEvent(EVENTID)
    document.getElementById('event-details').innerHTML = event.name + " | ID: " + event.id
}

async function BuildSchedule() {
    // Clear the current table
    $('#event-schedule-table thead').empty();
    $('#event-schedule-table tbody').empty();

    let eventLocations = await GetLocationsForEvent(EVENTID);
    let eventTimeslots = await GetTimeslotsForEvent(EVENTID);
    let eventSessions = await GetSessionsForEvent(EVENTID);

    const tableHead = document.getElementById('event-schedule-table-head');
    const tableBody = document.getElementById('event-schedule-table-body');

    // create the header row
    const headerRow = document.createElement('tr');
    const emptyCell = document.createElement('th')
    emptyCell.className = 'empty'
    headerRow.appendChild(emptyCell)

    // Add locations headers
    LocationsLength = eventLocations.length
    if (eventLocations.length > 0) {
        for (const eventLocation of eventLocations) {
            const th = document.createElement('th');
            th.className = 'header-top'
            let locationDetails = await GetLocation(eventLocation.location_id)
            th.innerText = locationDetails.name;

            removeButton = document.createElement('button')
            removeButton.innerHTML = "Remove Location"
            removeButton.onclick = function () {
                console.log("Remove")
                RemoveLocationFromEvent(EVENTID, eventLocation.id)
                return true
            }

            th.appendChild(removeButton)
            headerRow.appendChild(th)
        };
    }

    // Add a dropdown select at the end of the header row
    const locationsDropdownCell = document.createElement('th');
    locationsDropdownCell.className = 'header-top-end'
    locationsDropdownCell.appendChild(CreateDropdown(await GetLocationNames(), "Add Location", LocationsDropdownOnChange));
    headerRow.appendChild(locationsDropdownCell);

    tableHead.appendChild(headerRow)

    // Add Timeslots headers
    if (eventTimeslots.length > 0) {
        for (const eventTimeslot of eventTimeslots) {
            const row = document.createElement('tr');
            const th = document.createElement('th')
            th.className = 'header-side'
            let  timeslotDetails = await GetTimeslot(eventTimeslot.timeslot_id)
            th.innerText = timeslotDetails.name

            removeButton = document.createElement('button')
            removeButton.innerHTML = "Remove Timeslot"
            removeButton.onclick = function () {
                RemoveTimeslotFromEvent(EVENTID, eventTimeslot.id)
                return true
            }

            th.appendChild(removeButton)
            row.appendChild(th)

            // Create cells for each location
            for (const eventLocation of eventLocations) {
                const td = document.createElement('td');
                //td.className = 'square-cell'
                td.id = `session-${eventLocation.id}-${eventTimeslot.id}`
                row.appendChild(td);
            };

            tableBody.appendChild(row)
        }
    }

    // Add a dropdown select at the end of the header row
    const row = document.createElement('tr');
    const TimeslotsDropdownCell = document.createElement('th');
    TimeslotsDropdownCell.className = 'header-side-end'
    TimeslotsDropdownCell.appendChild(CreateDropdown(await GetTimeslotNames(), "Add Timeslot", TimeslotsDropdownOnChange));
    row.appendChild(TimeslotsDropdownCell);

    tableBody.appendChild(row)

    // Populate the sessions
    if (eventSessions.length > 0) {
        // Pre load this to prevent a load of requests
        workshopOptions = await GetWorkshopNames();
        for (const session of eventSessions) {
            sessionBlock = document.getElementById(`session-${session.event_location_id}-${session.event_timeslot_id}`)
            
            if (session.has_workshop == false) {
                sessionBlock.appendChild(CreateWorkshopDropdown(await workshopOptions, session.id))
            }
            else {
                workshop = await GetWorkshopForSession(session.id)
                workshopTitle = document.createElement('p')
                workshopTitle.innerText = workshop.name

                removeButton = document.createElement('button')
                removeButton.innerHTML = "Remove"
                removeButton.onclick = function() {
                    RemoveWorkshopFromSession(session.id)
                    return true
                }

                sessionBlock.appendChild(workshopTitle)
                sessionBlock.appendChild(removeButton)
            }
        }
    }
}

async function PopulateWorkshopSidebarList() {
    let searchBoxValue = document.getElementById('workshop-search-box').value
    let workshopNames = await GetWorkshopNames(searchBoxValue)

    let workshopList = document.getElementById('workshop-list')

    // Empty the list
    while (workshopList.firstChild) {
        workshopList.removeChild(workshopList.firstChild)
    }

    // Populate the list
    for (const workshop of workshopNames) {
        p = document.createElement('p')
        p.innerHTML = workshop.name
        workshopList.appendChild(p)
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", PopulateEventSelectionDropdown);
document.addEventListener("DOMContentLoaded", PopulateEventName);
document.addEventListener("DOMContentLoaded", BuildSchedule);
document.addEventListener("DOMContentLoaded", PopulateWorkshopSidebarList);