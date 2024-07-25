// Event Schedule Page

// Variables
var EVENTID = 1
var LocationIds = []
var LocationsLength = 0
var TimeslotsIds = []
var TimeslotsLength = 0
var currentDragType

var selectDifficultyIds = []
var selectedTags = []
var currentSearchQuery = ''

// Backend API Calls
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
            url: '/backend/locations/' + locationID + '/name',
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
            url = url + '?' + queryString
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

function GetDifficultyLevels() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/difficulty_levels',
            type: 'GET',
            success: function(response) {
                resolve(response.difficulty_levels);  
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

// General Methods

// Event Selection

// Populates the Event selection dropdown with all of the events
async function PopulateEventSelectionDropdown() {
    let events = await GetEventNames()

    eventSelectionDropdown = document.getElementById('event-selection')
    select = CreateDropdown(await events, await events[0].name, EventSelectionDropdownOnChange)
    select.id = 'event-select'
    select.classList.add('select-event-dropdown', 'form-control')
    eventSelectionDropdown.appendChild(select)
}

// Handles the onchange event for the Event selction dropdown 
function EventSelectionDropdownOnChange(event) {
    const selectedValue = event.target.value
    EVENTID = selectedValue
    GetEvent(EVENTID)
    UpdateSchedule()
    PopulateEventDetails()
}

// Event Details
// Populates the selected events details (name and date)
async function PopulateEventDetails() {
    let event = await GetEvent(EVENTID)
    let eventDetailsContainer = document.getElementById('event-details-container')
    eventDetailsContainer.classList.add('event-details')
    
    let title = document.createElement('h2')
    title.innerHTML = event.name
    title.classList.add('event-details-element')

    let date = document.createElement('p')
    date.innerHTML = formatDate(event.date)
    title.classList.add('event-details-element')

    EmptyElement(eventDetailsContainer)
    eventDetailsContainer.appendChild(title)
    eventDetailsContainer.appendChild(date)
}




// Workshop Selction
// Populates the list of workshop cards
async function PopulateWorkshopList() {
    
    let queryString = BuildWorkshopSearchQueryString()
    let workshops = await GetWorkshops(queryString)

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

// Handles updating the global reference of the selected difficulty ids
function UpdateDifficultyIdsList(checked, id) {
    if (checked) {
        // Add To list
        if (!selectDifficultyIds.includes(id)) {
            selectDifficultyIds.push(id)
        }
    }
    else {
        // Remove from list
        const index = selectDifficultyIds.indexOf(id)
        if (index > -1) {
            selectDifficultyIds.splice(index, 1)
        }
    }
}

// Populates the workshop selection tools (difficulties, tags)
async function PopulateWorkshopSelectionTools() {
    const workshopSelectionToolsContainer = document.getElementById('workshop-selection-tools-container')
    const difficultyLevels = await GetDifficultyLevels()

    // Difficulty
    let difficultyContainer = document.createElement('div')
    difficultyContainer.classList.add('workshop-selection-tools-sub-container')

    let difficultyTitle = document.createElement('label')
    difficultyTitle.classList.add('form-label', 'workshop-selection-tools-title')
    difficultyTitle.innerText = 'Difficulty'
    difficultyContainer.appendChild(difficultyTitle)

    let difficultyOptions = document.createElement('div')
    difficultyOptions.classList.add('form-selectgroup', 'form-selectgroup-pills')

    for (const level of difficultyLevels) {
        let option = document.createElement('label')
        option.classList.add('form-selectgroup-item')

        let input = document.createElement('input')
        input.type = 'checkbox'
        input.classList.add('form-selectgroup-input')
        option.appendChild(input)
        input.onchange = function () {
            if (!input.checked) {
                input.selected = false
            }
            UpdateDifficultyIdsList(input.checked, level.id)
            PopulateWorkshopList()
        }

        let text = document.createElement('span')
        text.classList.add('form-selectgroup-label')
        text.innerHTML = level.name + ' '

        let badge = document.createElement('span')
        badge.classList.add('badge', 'ms-auto')
        badge.style.backgroundColor = level.display_colour
        text.appendChild(badge)
        option.appendChild(text)

        difficultyOptions.appendChild(option)
    }

    difficultyContainer.appendChild(difficultyOptions)


    // Tags
    let tagsContainer = document.createElement('div')
    tagsContainer.classList.add('workshop-selection-tools-sub-container')

    let tagsTitle = document.createElement('label')
    tagsTitle.classList.add('form-label', 'workshop-selection-tools-title')
    tagsTitle.innerText = 'Tags'
    tagsContainer.appendChild(tagsTitle)

    let tagsSelect = document.createElement('select')
    tagsSelect.id = 'select-tags'
    tagsSelect.name = 'tags[]'
    tagsSelect.multiple = 'multiple'
    tagsSelect.placeholder = 'Select tags'

    for(i=0; i < 5; i++) {
        let option = document.createElement('option')
        option.value = i
        option.text = 'tag ' + i
        tagsSelect.appendChild(option)
    }

    tagsContainer.appendChild(tagsSelect)

    EmptyElement(workshopSelectionToolsContainer)
    workshopSelectionToolsContainer.appendChild(difficultyContainer)
    workshopSelectionToolsContainer.appendChild(tagsContainer)

    // Create the tom select for tags
    new TomSelect("#select-tags", {
        plugins: ['remove_button'],
        create: false,
        maxItems: null,
        onChange: function(values) {
            // TODO: ADD THIS WHEN TAGS ARE IMPLEMENTED
            //selectedTags = values
            //PopulateWorkshopList()
          }
      });
}

// Handles the event for when either of the workshop list scroll arrows are pressed
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

// Handles the event for when the workshop selection search bar's input is updated
function WorkshopSearchOnChange() {
    let tmp = document.getElementById('workshop-search-box').value
    let filtered = tmp.replace(/[?&|=\/\\]/g, '');

    currentSearchQuery = filtered

    PopulateWorkshopList()
}


// Drag and drop for Workshops

// Can be added to an element to allow drop
function allowDrop(ev) {
    ev.preventDefault();
}

// Can be added to an element to allow drag
function drag(ev, value) {
    ev.dataTransfer.setData("workshop-id", value);
    ev.dataTransfer.setData("drag-type", "blah");
    currentDragType = 'workshop-add'
}

// Handles the drop event
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


// Schedule Grid
// Builds out the schedule grid with all the data
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
            grabHandle.classList.add('location-column-grab-container', 'location-column-grab-container-style')
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
                div.classList.add('session-block', 'session-block-style')
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

// Updates the schedule using either a provided gridContainer or by generating its own with BuildSchedule()
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

// Handles the animation for when a workshop is dropped onto the scheudle
async function AnimateWorkshopDrop(sessionBlockId, workshopId, buildSchedule=true) {
    let schedulePromise
    if (buildSchedule) {
        schedulePromise = BuildSchedule()
    }
    
    const sessionBlock = document.getElementById(sessionBlockId)
    let workshop = await GetWorkshop(workshopId)
    let workshopCard = await BuildWorkshopCard(workshop)

    workshopCard.classList.add('workshop-card-animate-shrink', 'workshop-card-animate')
    EmptyElement(sessionBlock)
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

// Handles the animation for when a workshop is deleted from the schedule
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

// Sets up the event listeners to allow columns (locations) to be dragged
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

// Shows a modal warning the user about placing a workshop across a location
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

// Handles adding a workshop to multiple sessions
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

// Handles the event for when the locations selection dropdown is changed (ie: adds a location)
function LocationsDropdownOnChange(event) {
    const selectedValue = event.target.value
    AddLocationToEvent(EVENTID, selectedValue, LocationsLength)
}

// Handles the event for when the timeslots selection dropdown is changed (ie: adds a timeslot)
function TimeslotsDropdownOnChange(event) {
    const selectedValue = event.target.value
    AddTimeslotToEvent(EVENTID, selectedValue, LocationsLength)
}

// Handles the event for when a location column has been dropped to a new order
function LocationColumnOnDrop(eventLocationId, newOrder) {
    UpdateEventLocationOrder(EVENTID, eventLocationId, newOrder)
}


// Helper functions
// Creates a generic dropdown based on inputs
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

// Gets an icon element from the DOM based on a html ID
function GetIconElement(id) {
    element = document.getElementById(id)
    icon = element.cloneNode(true)
    icon.style.display = 'block'
    return icon
}

// Empties all children from a html element
function EmptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

// Builds a workshop card which is used to display workshops
async function BuildWorkshopCard(workshop, remove = true, session = null) {
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

// Creates a promise that only resolves when an element animation is done
function waitForTransitionEnd(element) {
    return new Promise(resolve => {
        const handler = () => {
            element.removeEventListener('transitionend', handler);
            resolve();
        };
        element.addEventListener('transitionend', handler);
    });
}

// Builds a workshop search query based on various inputs
function BuildWorkshopSearchQueryString() {
    queryString = ''
    if (currentSearchQuery != '') {
        queryString += `name|description=${currentSearchQuery}`
    }

    if (selectDifficultyIds.length > 0) {
        stringToAdd = 'difficulty_id='
        if (queryString != '') {
            stringToAdd = '&difficulty_id='
        }

        for(i = 0; i < selectDifficultyIds.length; i++) {
            id = selectDifficultyIds[i]

            if (i == 0){
                stringToAdd += id
            }
            else {
                stringToAdd += `|${id}`
            }
        }
        queryString += stringToAdd
    }

    if (selectedTags.length > 0) {
        stringToAdd = 'tag_ids='
        if (queryString != '') {
            stringToAdd = '&tag_ids='
        }

        for(i = 0; i < selectedTags.length; i++) {
            id = selectedTags[i]

            if (i == 0){
                stringToAdd += id
            }
            else {
                stringToAdd += `|${id}`
            }
        }
        queryString += stringToAdd
    }

    return queryString
}

// Formats a date from numbers to words (24-09-15 to 15th Spetember 2024)
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    
    // Function to get the ordinal suffix for the day
    function getOrdinalSuffix(n) {
        if (n > 3 && n < 21) return 'th';
        switch (n % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
    
    const dayWithSuffix = day + getOrdinalSuffix(day);
    
    return `${dayWithSuffix} ${month} ${year}`;
}

// Event Listeners
document.addEventListener("DOMContentLoaded", PopulateEventSelectionDropdown);
document.addEventListener("DOMContentLoaded", PopulateEventDetails);
document.addEventListener("DOMContentLoaded", function() {
    UpdateSchedule()
});
document.addEventListener("DOMContentLoaded", PopulateWorkshopList);
document.addEventListener("DOMContentLoaded", HandleWorkshopSelectionArrows);
document.addEventListener("DOMContentLoaded", PopulateWorkshopSelectionTools);