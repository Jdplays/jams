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

function GetWorkshops(queryString=null) {
    return new Promise((resolve, reject) => {
        url = "/backend/workshops"
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

function GetDifficultyLevel(difficultyLevelID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/difficulty_levels/' + difficultyLevelID,
            type: 'GET',
            success: function(response) {
                resolve(response);  
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
    select = CreateDropdown(await events, await events[0].name, EventSelectionDropdownOnChange)
    select.id = 'event-select'
    eventSelectionDropdown.appendChild(select)
} 

async function PopulateEventName() {
    let event = await GetEvent(EVENTID)
    document.getElementById('event-details').innerHTML = event.name + " | ID: " + event.id
}

// Drag and drop

function allowDrop(ev) {
    ev.preventDefault();
  }

function drag(ev, value) {
    ev.dataTransfer.setData("workshop-id", value);
  }

  async function drop(event) {
    event.preventDefault();
    var workshopID = event.dataTransfer.getData("workshop-id");
    var sessionID = event.target.getAttribute('session-id')
    AddWorkshopToSession(sessionID, workshopID)
    console.log(workshopID)
    console.log(sessionID)
  }

  function GetIconElement(id) {
    element = document.getElementById(id)
    icon = element.cloneNode(true)
    icon.style.display = 'block'
    return icon
  }

  function EmptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
  }


  async function BuildWorkshopCard(workshop, remove=true, session=null) {
    let workshopDifficulty = null
    if (workshop.difficulty_id != null) {
         workshopDifficulty = await GetDifficultyLevel(workshop.difficulty_id)
    }

    const workshopCard = document.createElement('div')
    workshopCard.classList.add('workshop-card')
    if (workshopDifficulty != null) {
        workshopCard.style.backgroundColor = hexToRgba(workshopDifficulty.display_colour, 0.5)
    }
    workshopCard.style.width = '150px'
    workshopCard.style.height = '150px'

    const workshopTitle = document.createElement('h4')
    workshopTitle.innerText = workshop.name

    const workshopDescription = document.createElement('p')
    workshopDescription.innerHTML = workshop.description
    workshopDescription.classList.add('truncate')

    workshopCard.appendChild(workshopTitle)
    workshopCard.append(workshopDescription)

    if (remove) {
        removeButton = GetIconElement('bin-icon')
        removeButton.onclick = function() {
            RemoveWorkshopFromSession(session.id)
            return true
        }

        workshopCard.appendChild(removeButton)
    }

    return workshopCard

  }

  // Function to convert hex to rgba
  function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

async function BuildSchedule() {
    const gridContainer = document.getElementById('grid-container');
    EmptyElement(gridContainer)

    let eventLocations = await GetLocationsForEvent(EVENTID);
    let eventTimeslots = await GetTimeslotsForEvent(EVENTID);
    let eventSessions = await GetSessionsForEvent(EVENTID);

    const columnCount = eventLocations.length + 1; // Extra column for the end button
    const rowCount = eventTimeslots.length + 1; // Extra row for the end button
    gridContainer.style.gridTemplateColumns = `100px repeat(${columnCount}, 150px)`;
    gridContainer.style.gridTemplateRows = `100px repeat(${rowCount}, 150px)`;


    // Add the top-left empty cell
    let div = document.createElement('div');
    gridContainer.appendChild(div);

    // Add locations headers
    LocationsLength = eventLocations.length
    if (eventLocations.length > 0) {
        for (const eventLocation of eventLocations) {
            let locationDetails = await GetLocation(eventLocation.location_id)
            let div = document.createElement('div');
            div.className = 'header-top';

            let p = document.createElement('p')
            p.innerText = locationDetails.name
            div.appendChild(p)

            const removeButton = document.createElement('button')
            removeButton.innerHTML = "Delete"
            removeButton.onclick = function () {
                console.log("Remove")
                RemoveLocationFromEvent(EVENTID, eventLocation.id)
                return true
            }

            div.appendChild(removeButton)
            gridContainer.appendChild(div);
        };
    }

    // Add a dropdown select at the end of the header row
    const locationsDropdownCell = document.createElement('div');
    locationsDropdownCell.className = 'header-top-end dropdown'
    btn = GetIconElement('table-add-icon')
    btn.classList.add("btn")
    btn.setAttribute('data-bs-toggle', 'dropdown');
    locationsDropdownCell.appendChild(btn)

    let locationNames = await GetLocationNames()
    dropdownMenu = document.createElement('div')
    dropdownMenu.className = 'dropdown-menu'
    for (const location of locationNames) {
        a = document.createElement('a')
        a.innerHTML = location.name
        a.className = "dropdown-item"
        a.onclick = function() {
            AddLocationToEvent(EVENTID, location.id, LocationsLength)
        }
        dropdownMenu.appendChild(a)
    }

    locationsDropdownCell.appendChild(dropdownMenu)

    //locationsDropdownCell.appendChild(CreateDropdown(await GetLocationNames(), "+", LocationsDropdownOnChange));
    gridContainer.appendChild(locationsDropdownCell);

    // Add Timeslots headers
    if (eventTimeslots.length > 0) {
        for (const eventTimeslot of eventTimeslots) {
            let  timeslotDetails = await GetTimeslot(eventTimeslot.timeslot_id)
            let div = document.createElement('div');
            div.className = 'header-side';
            
            let p = document.createElement('p')
            p.innerText = timeslotDetails.name
            div.appendChild(p)
            gridContainer.appendChild(div);

            const removeButton = document.createElement('button')
            removeButton.innerHTML = "Delete"
            removeButton.onclick = function () {
                RemoveTimeslotFromEvent(EVENTID, eventTimeslot.id)
                return true
            }

            div.appendChild(removeButton)

            // Create cells for each location
            for (const eventLocation of eventLocations) {
                const div = document.createElement('div');
                div.className = 'session-block'
                div.id = `session-${eventLocation.id}-${eventTimeslot.id}`
                gridContainer.appendChild(div);
            };

            // Add the row end empty cell
            let empty = document.createElement('div');
            empty.className = 'empty'
            gridContainer.appendChild(empty);
        }
    }

    // Add a dropdown select at the end of the header row
    const TimeslotsDropdownCell = document.createElement('div');
    TimeslotsDropdownCell.className = 'header-side-end'
    btn = GetIconElement('table-add-icon')
    btn.classList.add("btn")
    btn.setAttribute('data-bs-toggle', 'dropdown');
    TimeslotsDropdownCell.appendChild(btn)

    let timeslotNames = await GetTimeslotNames()
    dropdownMenu = document.createElement('div')
    dropdownMenu.className = 'dropdown-menu'
    for (const timeslot of timeslotNames) {
        a = document.createElement('a')
        a.innerHTML = timeslot.name
        a.className = "dropdown-item"
        a.onclick = function() {
            AddTimeslotToEvent(EVENTID, timeslot.id)
        }
        dropdownMenu.appendChild(a)
    }

    TimeslotsDropdownCell.appendChild(dropdownMenu)
    gridContainer.appendChild(TimeslotsDropdownCell);

    // Populate the sessions
    if (eventSessions.length > 0) {
        for (const session of eventSessions) {
            const sessionBlock = document.getElementById(`session-${session.event_location_id}-${session.event_timeslot_id}`)
            sessionBlock.className = 'session-block'

            if (session.has_workshop == false) {
                sessionBlock.addEventListener('drop', drop);
                sessionBlock.addEventListener('dragover', allowDrop);
                sessionBlock.setAttribute('session-id', session.id)
            }
            else {
                workshopCard = await BuildWorkshopCard(await GetWorkshopForSession(session.id), true, session)
                sessionBlock.appendChild(workshopCard)
            }
        }
    }
}

async function PopulateWorkshopSidebarList() {
    let searchBoxValue = document.getElementById('workshop-search-box').value
    let workshops = await GetWorkshops(searchBoxValue)

    let workshopList = document.getElementById('workshop-list')

    // Empty the list
    EmptyElement(workshopList)

    // Populate the list
    for (const workshop of workshops) {
        workshopCard = await BuildWorkshopCard(workshop, false)
        workshopCard.id = "drag-drop-workshop-" + workshop.id
        workshopCard.classList.add('workshop-card-list-item')
        workshopCard.draggable = true
        workshopCard.addEventListener('dragstart', function (event) {
             drag(event, workshop.id)
        });
        workshopList.appendChild(workshopCard)
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", PopulateEventSelectionDropdown);
document.addEventListener("DOMContentLoaded", PopulateEventName);
document.addEventListener("DOMContentLoaded", BuildSchedule);
document.addEventListener("DOMContentLoaded", PopulateWorkshopSidebarList);






