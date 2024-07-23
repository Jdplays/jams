var EVENTID = 1
var LocationIds = []
var LocationsLength = 0
var TimeslotsIds = []
var TimeslotsLength = 0
var currentDragType

function GetEventNames() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/name',
            type: 'GET',
            success: function (response) {
                resolve(response.events)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response.event_locations)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response.event_timeslots)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response.sessions)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}


function GetEventLocation(eventID, eventLocationID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/' + eventID + '/locations/' + eventLocationID,
            type: 'GET',
            success: function (response) {
                resolve(response)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}


function GetEventTimeslot(eventID, eventTimeslotID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/' + eventID + '/timeslots/' + eventTimeslotID,
            type: 'GET',
            success: function (response) {
                resolve(response)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function GetWorkshopForSession(sessionID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/sessions/' + sessionID + '/workshop',
            type: 'GET',
            success: function (response) {
                resolve(response.workshop)
            },
            error: function (error, response) {
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
            success: function (response) {
                resolve(response)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response.locations)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response.timeslots)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetWorkshops(queryString = null) {
    return new Promise((resolve, reject) => {
        url = "/backend/workshops"
        if (queryString != null) {
            url = url + '?name=' + queryString
        }
        $.ajax({
            url: url,
            type: 'GET',
            success: function (response) {
                resolve(response.workshops)
            },
            error: function (error) {
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
            success: function (response) {
                resolve(response);
            },
            error: function (error) {
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
        success: function (response) {
            UpdateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}

function UpdateEventLocationOrder(eventID, eventLocationID, order) {
    const data = {
        'order': order
    }

    $.ajax({
        url: '/backend/events/' + eventID + '/locations/' + eventLocationID + '/update_order',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function (response) {
            UpdateSchedule()
        },
        error: function (error) {
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
        success: function (response) {
            UpdateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}

function AddWorkshopToSession(sessionID, workshopID, force = false) {
    return new Promise((resolve) => {
        const data = {
            'workshop_id': workshopID,
        }

        if (force) {
            data['force'] = force
        }

        $.ajax({
            url: '/backend/sessions/' + sessionID + '/workshop',
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

function RemoveWorkshopFromSession(sessionID) {
    return new Promise((resolve) => {
        $.ajax({
            url: '/backend/sessions/' + sessionID + '/workshop',
            type: 'DELETE',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

function RemoveLocationFromEvent(eventID, eventLocationID) {
    $.ajax({
        url: '/backend/events/' + eventID + '/locations/' + eventLocationID,
        type: 'DELETE',
        success: function (response) {
            UpdateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}

function RemoveTimeslotFromEvent(eventID, eventTimeslotID) {
    $.ajax({
        url: '/backend/events/' + eventID + '/timeslots/' + eventTimeslotID,
        type: 'DELETE',
        success: function (response) {
            UpdateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}


function EventSelectionDropdownOnChange(event) {
    const selectedValue = event.target.value
    EVENTID = selectedValue
    GetEvent(EVENTID)
    UpdateSchedule()
}

function LocationsDropdownOnChange(event) {
    const selectedValue = event.target.value
    AddLocationToEvent(EVENTID, selectedValue, LocationsLength)
}

function TimeslotsDropdownOnChange(event) {
    const selectedValue = event.target.value
    AddTimeslotToEvent(EVENTID, selectedValue, LocationsLength)
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

    select.onchange = function () {
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
    ev.dataTransfer.setData("drag-type", "blah");
    currentDragType = 'workshop-add'
}

async function drop(event) {
    if (currentDragType === 'workshop-add') {
        event.preventDefault();
        var workshopID = event.dataTransfer.getData("workshop-id");
        var sessionID = event.target.getAttribute('session-id')
        if (await AddWorkshopToSession(sessionID, workshopID)) {
            await AnimateWorkshopDrop(event.target.id, workshopID)
        }
    }
    currentDragType = ''
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


async function BuildWorkshopCard(workshop, remove = true, session = null) {
    let workshopDifficulty = null
    if (workshop.difficulty_id != null) {
        workshopDifficulty = await GetDifficultyLevel(workshop.difficulty_id)
    }

    const workshopCard = document.createElement('div')
    workshopCard.classList.add('workshop-card')
    if (workshopDifficulty != null) {
        workshopCard.style.backgroundColor = hexToRgba(workshopDifficulty.display_colour, 0.4)
    }
    workshopCard.style.width = '150px'
    workshopCard.style.height = '150px'

    const workshopTitleContainer = document.createElement('div')
    workshopTitleContainer.classList.add('workshop-title-container')

    const workshopTitleContainerPaddingColumn = document.createElement('div')
    workshopTitleContainerPaddingColumn.classList.add('workshop-title-column')
    workshopTitleContainer.appendChild(workshopTitleContainerPaddingColumn)

    const workshopTitle = document.createElement('p')
    workshopTitle.classList.add('workshop-title', 'workshop-title-column')
    workshopTitle.innerText = workshop.name
    workshopTitleContainer.appendChild(workshopTitle)


    const workshopTitleContianerRemove = document.createElement('div')
    workshopTitleContianerRemove.classList.add('workshop-title-column')
    if (remove) {
        removeButton = GetIconElement('bin-icon')
        icon = removeButton.querySelector('#icon')
        icon.classList.remove('icon-tabler-trash')
        icon.classList.add('icon-bin-session')
        if (session != null) {
            workshopCard.id = `session-${session.id}-workshop-${workshop.id}`
        
            removeButton.onclick = async function () {
                if (await RemoveWorkshopFromSession(session.id)) {
                    AnimateWorkshopDelete(workshopCard.id)
                }
                return true
            }
        }

        workshopTitleContianerRemove.appendChild(removeButton)
    }

    workshopTitleContainer.appendChild(workshopTitleContianerRemove)

    const workshopDescription = document.createElement('p')
    workshopDescription.innerHTML = workshop.description
    workshopDescription.classList.add('truncate')

    workshopCard.appendChild(workshopTitleContainer)
    workshopCard.append(workshopDescription)

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
    LocationIds = []
    TimeslotsIds = []

    const gridContainer = document.createElement('div')
    gridContainer.id = 'grid-container'
    gridContainer.classList.add('grid-container')

    let eventLocations = await GetLocationsForEvent(EVENTID);
    let eventTimeslots = await GetTimeslotsForEvent(EVENTID);
    let eventSessions = await GetSessionsForEvent(EVENTID);

    const columnCount = eventLocations.length + 1; // Extra column for the end button
    const rowCount = eventTimeslots.length + 1; // Extra row for the end button
    gridContainer.style.gridTemplateColumns = `100px repeat(${columnCount}, 150px)`;
    gridContainer.style.gridTemplateRows = `100px repeat(${rowCount}, 150px)`;


    // Add the top-left empty cell
    let div = document.createElement('div');
    div.classList.add('header')
    gridContainer.appendChild(div);

    // Add locations headers
    LocationsLength = eventLocations.length
    if (LocationsLength > 0) {
        for (const eventLocation of eventLocations) {
            LocationIds.push(eventLocation.id)
            let locationDetails = await GetLocation(eventLocation.location_id)
            let div = document.createElement('div');
            div.setAttribute('event-location-id', eventLocation.id)
            div.setAttribute('data-index', eventLocation.order)
            div.addEventListener('dragover', allowDrop);
            div.classList.add('header', 'header-top');

            const locationContainer = document.createElement('div')
            locationContainer.classList.add('header-container')

            let locationName = document.createElement('p')
            locationName.classList.add('header-row')
            locationName.innerText = locationDetails.name
            locationContainer.appendChild(locationName)

            const removeButton = GetIconElement('bin-icon')
            removeButton.classList.add('header-row')
            removeButton.onclick = function () {
                confirmDeleteModal = $('#confirm-delete')
                confirmDeleteModal.modal('show')

                confirmDeleteModal.find('#confirm-delete-text').text(`
                    Any workshops assigned to ${locationDetails.name} will be removed. 
                `);

                confirmDeleteModal.find('#confirm-delete-button').off('click');

                confirmDeleteModal.find('#confirm-delete-button').click(function () {
                    RemoveLocationFromEvent(EVENTID, eventLocation.id)
                });

                return true
            }

            locationContainer.appendChild(removeButton)

            let grabHandle = GetIconElement('column-move')
            grabHandle.classList.add('location-column-grab-container')
            grabHandle.style.display = 'none'

            div.addEventListener('mouseover', (e) => {
                grabHandle.style.display = 'block'
            });

            div.addEventListener('mouseleave', (e) => {
                grabHandle.style.display = 'none'
            });

            div.appendChild(grabHandle)
            div.appendChild(locationContainer)
            gridContainer.appendChild(div);
        };
    }

    // Add a dropdown select at the end of the header row
    const locationsDropdownCell = document.createElement('div');
    locationsDropdownCell.classList.add('header-end', 'header-top-end', 'dropdown')
    btn = GetIconElement('table-add-icon')
    btn.setAttribute('data-bs-toggle', 'dropdown');
    locationsDropdownCell.appendChild(btn)

    let locationNames = await GetLocationNames()
    dropdownMenu = document.createElement('div')
    dropdownMenu.className = 'dropdown-menu'
    for (const location of locationNames) {
        a = document.createElement('a')
        a.innerHTML = location.name
        a.className = "dropdown-item"
        a.onclick = function () {
            AddLocationToEvent(EVENTID, location.id, LocationsLength)
        }
        dropdownMenu.appendChild(a)
    }

    locationsDropdownCell.appendChild(dropdownMenu)

    //locationsDropdownCell.appendChild(CreateDropdown(await GetLocationNames(), "+", LocationsDropdownOnChange));
    gridContainer.appendChild(locationsDropdownCell);

    // Add Timeslots headers
    TimeslotsLength = eventTimeslots.length;
    if (TimeslotsLength > 0) {
        for (const eventTimeslot of eventTimeslots) {
            TimeslotsIds.push(eventTimeslot.id)
            let timeslotDetails = await GetTimeslot(eventTimeslot.timeslot_id)
            let div = document.createElement('div');
            div.classList.add('header', 'header-side');

            const timeslotContainer = document.createElement('div')
            timeslotContainer.classList.add('header-container')

            let timeslotName = document.createElement('p')
            timeslotName.classList.add('header-row')
            timeslotName.innerText = timeslotDetails.name
            timeslotContainer.appendChild(timeslotName)

            let timeslotRange = document.createElement('p')
            timeslotRange.classList.add('header-row', 'timeslot-range')
            timeslotRange.innerText = timeslotDetails.range
            timeslotContainer.appendChild(timeslotRange)

            emptyTimeslotRow = document.createElement('div')
            emptyTimeslotRow.classList.add('header-row', 'header-row-spacer')
            timeslotContainer.appendChild(emptyTimeslotRow)


            const removeButton = GetIconElement('bin-icon')
            removeButton.classList.add('header-row')
            removeButton.onclick = function () {
                confirmDeleteModal = $('#confirm-delete')
                confirmDeleteModal.modal('show')

                confirmDeleteModal.find('#confirm-delete-text').text(`
                    Any workshops assigned to ${timeslotDetails.name} will be removed. 
                `);

                confirmDeleteModal.find('#confirm-delete-button').off('click');

                confirmDeleteModal.find('#confirm-delete-button').click(function () {
                    RemoveTimeslotFromEvent(EVENTID, eventTimeslot.id)
                });

                return true
            }

            timeslotContainer.appendChild(removeButton)
            div.appendChild(timeslotContainer)
            gridContainer.appendChild(div);

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
    TimeslotsDropdownCell.classList.add('header-end', 'header-side-end')
    btn = GetIconElement('table-add-icon')
    btn.setAttribute('data-bs-toggle', 'dropdown');
    TimeslotsDropdownCell.appendChild(btn)

    let timeslotNames = await GetTimeslotNames()
    dropdownMenu = document.createElement('div')
    dropdownMenu.className = 'dropdown-menu'
    for (const timeslot of timeslotNames) {
        a = document.createElement('a')
        a.innerHTML = timeslot.name
        a.className = "dropdown-item"
        a.onclick = function () {
            AddTimeslotToEvent(EVENTID, timeslot.id)
        }
        dropdownMenu.appendChild(a)
    }

    TimeslotsDropdownCell.appendChild(dropdownMenu)
    gridContainer.appendChild(TimeslotsDropdownCell);

    // Populate the sessions
    if (eventSessions.length > 0) {
        for (const session of eventSessions) {
            const sessionBlock = gridContainer.querySelector(`#session-${session.event_location_id}-${session.event_timeslot_id}`)
            sessionBlock.classList.add('session-block')

            if (session.has_workshop == false) {
                sessionBlock.addEventListener('drop', drop);
                sessionBlock.addEventListener('dragover', allowDrop);
                sessionBlock.setAttribute('session-id', session.id)
            }
            else {
                let workshop = await GetWorkshopForSession(session.id)
                workshopCard = await BuildWorkshopCard(workshop, true, session)
                sessionBlock.appendChild(workshopCard)
                sessionBlock.setAttribute('session-id', session.id)
                sessionBlock.setAttribute('workshop-id', workshop.id)
            }
        }
    }
    
    return gridContainer
}

async function UpdateSchedule(gridContainer=null) {
    if (gridContainer == null) {
        gridContainer = await BuildSchedule()
    }
    const scheduleContainer = document.getElementById('schedule-container')
    EmptyElement(scheduleContainer)
    scheduleContainer.appendChild(gridContainer)

    // Setup the event listeners to allow columns to be dragged
    SetUpColumnDragEventListeners()
}

function waitForTransitionEnd(element) {
    return new Promise(resolve => {
        const handler = () => {
            element.removeEventListener('transitionend', handler);
            resolve();
        };
        element.addEventListener('transitionend', handler);
    });
}

async function AnimateWorkshopDrop(sessionBlockId, workshopId, buildSchedule=true) {
    let schedulePromise
    if (buildSchedule) {
        schedulePromise = BuildSchedule()
    }
    
    const sessionBlock = document.getElementById(sessionBlockId)
    let workshop = await GetWorkshop(workshopId)
    let workshopCard = await BuildWorkshopCard(workshop)

    workshopCard.classList.add('workshop-card-animate-shrink', 'workshop-card-animate')
    sessionBlock.appendChild(workshopCard)

    // Trigger a reflow to ensure initial styles are applied
    workshopCard.offsetHeight; // Forces a reflow

    requestAnimationFrame(() => {
        workshopCard.classList.add('workshop-card-animate-grow')
    })

    await waitForTransitionEnd(workshopCard);

    if (buildSchedule) {
        const schedule = await schedulePromise;
        UpdateSchedule(schedule)
    }
}

async function AnimateWorkshopDelete(workshopCardId, buildSchedule=true) {
    let schedulePromise
    if (buildSchedule) {
        schedulePromise = BuildSchedule()
    }
    
    const workshopCard = document.getElementById(workshopCardId)
    workshopCard.classList.add('workshop-card-animate')

    // Trigger a reflow to ensure initial styles are applied
    workshopCard.offsetHeight; // Forces a reflow

    requestAnimationFrame(() => {
        workshopCard.classList.add('workshop-card-animate-shrink')
    })

    await waitForTransitionEnd(workshopCard);

    if (buildSchedule) {
        const schedule = await schedulePromise;
        UpdateSchedule(schedule)
    }
}

async function PopulateWorkshopSidebarList() {
    let searchBoxValue = document.getElementById('workshop-search-box').value
    let workshops = await GetWorkshops(searchBoxValue)

    let workshopList = document.getElementById('workshop-selection-list')

    let elementList = []

    // Populate the list
    for (const workshop of workshops) {
        const workshopListBlock = document.createElement('div')
        workshopListBlock.classList.add('workshop-list-block')
        workshopCard = await BuildWorkshopCard(workshop, false)
        workshopCard.id = "drag-drop-workshop-" + workshop.id
        workshopCard.draggable = true
        workshopCard.addEventListener('dragstart', function (event) {
            drag(event, workshop.id)
        });
        workshopListBlock.appendChild(workshopCard)
        elementList.push(workshopListBlock)
    }

    // Empty the list
    EmptyElement(workshopList)

    for (element of elementList) {
        workshopList.append(element)
    }

}

function SetUpColumnDragEventListeners() {
    const gridContainer = document.getElementById('grid-container');
    let draggedColumn = null;
    let draggedIndex = null;
    let dropIndicator = document.createElement('div');
    dropIndicator.classList.add('location-column-drop-indicator');
    dropIndicator.style.display = 'none'
    gridContainer.appendChild(dropIndicator);

    document.querySelectorAll('.location-column-grab-container').forEach(grabHandle => {
        grabHandle.addEventListener('dragstart', (e) => {
            draggedColumn = grabHandle.closest('.header-top');
            draggedIndex = Number(draggedColumn.getAttribute('data-index'));
            e.dataTransfer.effectAllowed = 'move';

            currentDragType = 'column-move'

            e.dataTransfer.setData('event-location-id', draggedColumn.getAttribute('event-location-id'))
            e.dataTransfer.setDragImage(grabHandle.parentElement, 75, 4)
        });

        grabHandle.addEventListener('dragend', () => {
            dropIndicator.style.display = 'none';
        });

        grabHandle.parentElement.addEventListener('dragover', (e) => {
            if (currentDragType === 'column-move') {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const target = e.target.closest('.header-top');
                if (target) {
                    dropIndicator.style.display = 'block'
                    target.appendChild(dropIndicator)
                }
            }
        });

        grabHandle.parentElement.addEventListener('drop', (e) => {
            if (currentDragType === 'column-move') {
                e.preventDefault();
                dropIndicator.style.display = 'none';
                const target = e.target.closest('.header-top');
                if (target && target !== draggedColumn) {
                    const targetIndex = Number(target.getAttribute('data-index'));

                    let newIndex = targetIndex

                    let eventLocationId = e.dataTransfer.getData('event-location-id')

                    LocationColumnOnDrop(eventLocationId, newIndex);
                    currentDragType = ''
                }
            }
            else if (currentDragType === 'workshop-add') {
                // TODO: Add logic to assign workshop to location across all timeslots
                const target = e.target.closest('.header-top');
                let workshopId = e.dataTransfer.getData("workshop-id");
                let eventLocationId = Number(target.getAttribute('event-location-id'))

                let sessionIds = []
                let sessionWorkshopIds = []
                let sessionBlockIds = []

                for (const eventTimeslotId of TimeslotsIds) {
                    let sessionBlockId = `session-${eventLocationId}-${eventTimeslotId}`
                    sessionBlockIds.push(sessionBlockId)
                    let sessionBlock = document.getElementById(sessionBlockId)
                    let sessionId = sessionBlock.getAttribute('session-id')
                    sessionIds.push(sessionId)

                    let sessionWorkshopId = sessionBlock.getAttribute('workshop-id')
                    if (sessionWorkshopId != null) {
                        sessionWorkshopIds.push(sessionWorkshopId)
                    }
                }

                if (sessionWorkshopIds.length > 0) {
                    ShowMassPlaceWorkshopModal(sessionBlockIds, sessionIds, eventLocationId, workshopId)
                }
                else {
                    AddWorkshopToMultipleSessions(sessionBlockIds, sessionIds, workshopId, false)
                }
            }
        });

    });
}

async function ShowMassPlaceWorkshopModal(sessionBlockIds, sessionIds, eventLocationId, workshopId) {
    dangerModal = $('#mass-place-workshop-modal')
    dangerModal.modal('show')

    let eventLocation = await GetEventLocation(EVENTID, eventLocationId)
    let location = await GetLocation(eventLocation.location_id)
    let workshop = await GetWorkshop(workshopId)

    dangerModal.find('.text-secondary').text(`
        ${location.name} already has workshops assigned to it. Do you want to overwrite them with ${workshop.name} or place ${workshop.name} around them?
    `);

    // Remove existing event listeners to prevent duplicates
    dangerModal.find('#mass-place-workshop-overwrite').off('click');
    dangerModal.find('#mass-place-workshop-around').off('click');

    dangerModal.find('#mass-place-workshop-overwrite').click(function () {
        AddWorkshopToMultipleSessions(sessionBlockIds, sessionIds, workshopId, true)
    })

    dangerModal.find('#mass-place-workshop-around').click(function () {
        AddWorkshopToMultipleSessions(sessionBlockIds, sessionIds, workshopId, false)
    })
}

async function AddWorkshopToMultipleSessions(sessionBlockIds, sessionIds, workshopId, force) {
    const addPromises = [];
    const dropPromises = [];
    let schedulePromise;

    for (let i = 0; i < sessionIds.length; i++) {
        addPromises.push(
            AddWorkshopToSession(sessionIds[i], workshopId, force).then(result => ({ result, index: i }))
        );
    }

    // Wait for all AddWorkshopToSession promises to complete
    results = await Promise.all(addPromises);
    
    schedulePromise = BuildSchedule();

    // Execute the specific line of code after AddWorkshopToSession calls are done
    console.log("All AddWorkshopToSession calls completed");

    // Now handle AnimateWorkshopDrop based on the results
    for (const { result, index } of results) {
        if (result) {
            dropPromises.push(AnimateWorkshopDrop(sessionBlockIds[index], workshopId, false));
        }
    }

    // Wait for all AnimateWorkshopDrop promises to complete
    await Promise.all(dropPromises);
    const schedule = await schedulePromise;
    UpdateSchedule(schedule)
}

function LocationColumnOnDrop(eventLocationId, newOrder) {
    UpdateEventLocationOrder(EVENTID, eventLocationId, newOrder)
}


function HandleWorkshopSelectionArrows() {
    const scrollContainer = document.getElementById('workshop-selection-list');
    const leftArrow = document.getElementById('workshop-selection-list-left-arrow');
    const rightArrow = document.getElementById('workshop-selection-list-right-arrow');

    function updateArrows() {
        const scrollLeft = scrollContainer.scrollLeft;
        const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        const leftIcon = leftArrow.querySelector('#icon')
        const rightIcon = rightArrow.querySelector('#icon')

        if (scrollLeft === 0) {
            leftIcon.style.display = 'none';
            rightIcon.style.display = 'block';
        } else if (scrollLeft >= maxScrollLeft) {
            leftIcon.style.display = 'block';
            rightIcon.style.display = 'none';
        } else {
            leftIcon.style.display = 'block';
            rightIcon.style.display = 'block';
        }

      }

    rightArrow.addEventListener('click', function () {
        scrollContainer.scrollBy({ left: 150, behavior: 'smooth' });
    });

    leftArrow.addEventListener('click', function () {
        scrollContainer.scrollBy({ left: -150, behavior: 'smooth' });
    });

    scrollContainer.addEventListener('scroll', updateArrows);

    // Initialize arrows visibility
    updateArrows();
}

// Event Listeners
document.addEventListener("DOMContentLoaded", PopulateEventSelectionDropdown);
document.addEventListener("DOMContentLoaded", PopulateEventName);
document.addEventListener("DOMContentLoaded", function() {
    UpdateSchedule()
});
document.addEventListener("DOMContentLoaded", PopulateWorkshopSidebarList);
document.addEventListener("DOMContentLoaded", HandleWorkshopSelectionArrows);