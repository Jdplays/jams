var EVENTID = 1
var LocationsLength = 0

function GetEvents() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/admin/get_events_table',
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

function GetEventDetails() {
    $.ajax({
        url: '/admin/get_event_details/' + EVENTID,
        type: 'GET',
        success: function(response) {
            document.getElementById('event-details').innerHTML = response.name + " | ID: " + response.id
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    })
}

function GetLocationsForEvent(eventID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/admin/get_locations_for_event/' + eventID,
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
            url: '/admin/get_timeslots_for_event/' + eventID,
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
            url: '/admin/get_sessions_for_event/' + eventID,
            type: 'GET',
            success: function(response) {
                resolve(response.event_sessions)
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetLocationDetails(locationID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/management/get_location_details/' + locationID,
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

function GetTimeslotDetails(timeslotID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/management/get_timeslot_details/' + timeslotID,
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

function GetWorkshopDetails(workshopID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/management/get_workshop_details/' + workshopID,
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

function GetAllLocationOptions() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/management/get_locations_table',
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

function GetAllTimeslotOptions() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/management/get_timeslots_table',
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

function GetAllWorkshopOptions() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/management/get_workshop_catalog_table',
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
        'event_id': eventID,
        'location_id': location_id,
        'order': order
    }

    $.ajax({
        url: '/admin/create_event_location',
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
        'event_id': eventID,
        'timeslot_id': timeslot_id,
    }

    $.ajax({
        url: '/admin/create_event_timeslot',
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
        'session_id': sessionID,
        'workshop_id': workshopID,
    }

    $.ajax({
        url: '/admin/add_workshop_to_session',
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
    const data = {
        'session_id': sessionID,
    }

    $.ajax({
        url: '/admin/remove_worshop_from_session',
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

function RemoveLocationFromEvent(eventLocationID) {
    const data = {
        'event_location_id': eventLocationID,
    }

    $.ajax({
        url: '/admin/delete_event_location',
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

function RemoveTimeslotFromEvent(eventTimeslotID) {
    const data = {
        'event_timeslot_id': eventTimeslotID,
    }

    $.ajax({
        url: '/admin/delete_event_timeslot',
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


function EventSelectionDropdownOnChange(event) {
    const selectedValue = event.target.value
    EVENTID = selectedValue
    GetEventDetails()
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
    let events = await GetEvents()

    eventSelectionDropdown = document.getElementById('event-selection')
    eventSelectionDropdown.appendChild(CreateDropdown(await events, await events[0].name, EventSelectionDropdownOnChange))
} 

async function BuildSchedule() {
    // Clear the current table
    $('#event-schedule-table thead').empty();
    $('#event-schedule-table tbody').empty();

    let eventLocations = await GetLocationsForEvent(EVENTID); // TODO: Update the 1 to a dynamic value
    let eventTimeslots = await GetTimeslotsForEvent(EVENTID);
    let eventSessions = await GetSessionsForEvent(EVENTID);

    const tableHead = document.getElementById('event-schedule-table-head');
    const tableBody = document.getElementById('event-schedule-table-body');

    // create the header row
    const headerRow = document.createElement('tr');
    const emptyCell = document.createElement('th')
    headerRow.appendChild(emptyCell)

    // Add locations headers
    LocationsLength = eventLocations.length
    if (eventLocations.length > 0) {
        for (const eventLocation of eventLocations) {
            const th = document.createElement('th');
            let locationDetails = await GetLocationDetails(eventLocation.location_id)
            th.innerText = locationDetails.name;

            removeButton = document.createElement('button')
            removeButton.innerHTML = "Remove Location"
            removeButton.onclick = function () {
                console.log("Remove")
                RemoveLocationFromEvent(eventLocation.id)
                return true
            }

            th.appendChild(removeButton)
            headerRow.appendChild(th)
        };
    }

    // Add a dropdown select at the end of the header row
    const locationsDropdownCell = document.createElement('th');
    locationsDropdownCell.appendChild(CreateDropdown(await GetAllLocationOptions(), "Add Location", LocationsDropdownOnChange));
    headerRow.appendChild(locationsDropdownCell);

    tableHead.appendChild(headerRow)

    // Add Timeslots headers
    if (eventTimeslots.length > 0) {
        for (const eventTimeslot of eventTimeslots) {
            const row = document.createElement('tr');
            const th = document.createElement('th')
            let  timeslotDetails = await GetTimeslotDetails(eventTimeslot.timeslot_id)
            th.innerText = timeslotDetails.name

            removeButton = document.createElement('button')
            removeButton.innerHTML = "Remove Timeslot"
            removeButton.onclick = function () {
                RemoveTimeslotFromEvent(eventTimeslot.id)
                return true
            }

            th.appendChild(removeButton)
            row.appendChild(th)

            // Create cells for each location
            for (const eventLocation of eventLocations) {
                const td = document.createElement('td');
                td.id = `session-${eventLocation.id}-${eventTimeslot.id}`
                row.appendChild(td);
            };

            tableBody.appendChild(row)
        }
    }

    // Add a dropdown select at the end of the header row
    const row = document.createElement('tr');
    const TimeslotsDropdownCell = document.createElement('th');
    TimeslotsDropdownCell.appendChild(CreateDropdown(await GetAllTimeslotOptions(), "Add Timeslot", TimeslotsDropdownOnChange));
    row.appendChild(TimeslotsDropdownCell);

    tableBody.appendChild(row)

    // Populate the sessions
    if (eventSessions.length > 0) {
        // Pre load this to prevent a load of requests
        workshopOptions = await GetAllWorkshopOptions();
        for (const session of eventSessions) {
            sessionBlock = document.getElementById(`session-${session.event_location_id}-${session.event_timeslot_id}`)
            
            if (session.workshop_id == undefined) {
                sessionBlock.appendChild(CreateWorkshopDropdown(await workshopOptions, session.id))
            }
            else {
                workshopTitle = document.createElement('p')
                workshopDetails = await GetWorkshopDetails(session.workshop_id)
                workshopTitle.innerText = workshopDetails.name

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

// Event Listeners
document.addEventListener("DOMContentLoaded", PopulateEventSelectionDropdown);
document.addEventListener("DOMContentLoaded", GetEventDetails);
document.addEventListener("DOMContentLoaded", BuildSchedule);