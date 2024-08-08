// Event Schedule Page

import {
    buildQueryString,
    emptyElement,
    hexToRgba,
    getIconData
} from '../global/helper.js'

import {ScheduleGrid} from '../global/schedule_grid.js'

// Variables
var EventId = 1
var LocationIds = []
var LocationsLength = 0
var TimeslotsIds = []
var TimeslotsLength = 0
var currentDragType

var selectDifficultyIds = []
var selectedTags = []
var currentSearchQuery = ''

// Schedule Grid
const scheduleGridOptions = {
    eventId: EventId,
    edit: true,
    size: 150
}

const scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)

// Backend API Calls
function getEventNames() {
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

function getEvent(eventID) {
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


function getEventLocation(eventID, eventLocationID) {
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


function getEventTimeslot(eventID, eventTimeslotID) {
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

function getWorkshopForSession(sessionID) {
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

function getLocation(locationID) {
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

function getTimeslot(timeslotID) {
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

function getWorkshop(workshopID) {
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

function getWorkshops(queryString = null) {
    return new Promise((resolve, reject) => {
        let url = "/backend/workshops"
        if (queryString != null) {
            url += `?${queryString}`
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

function getDifficultyLevels() {
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

function getDifficultyLevel(difficultyLevelID) {
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


function addLocationToEvent(eventID, location_id, order) {
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
            updateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}

function updateEventLocationOrder(eventID, eventLocationID, order) {
    const data = {
        'order': order
    }

    $.ajax({
        url: '/backend/events/' + eventID + '/locations/' + eventLocationID + '/update_order',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function (response) {
            updateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}

function addTimeslotToEvent(eventID, timeslot_id) {
    const data = {
        'timeslot_id': timeslot_id
    }

    $.ajax({
        url: '/backend/events/' + eventID + '/timeslots',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function (response) {
            updateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}

function removeLocationFromEvent(eventID, eventLocationID) {
    $.ajax({
        url: '/backend/events/' + eventID + '/locations/' + eventLocationID,
        type: 'DELETE',
        success: function (response) {
            updateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}

function removeTimeslotFromEvent(eventID, eventTimeslotID) {
    $.ajax({
        url: '/backend/events/' + eventID + '/timeslots/' + eventTimeslotID,
        type: 'DELETE',
        success: function (response) {
            updateSchedule()
        },
        error: function (error) {
            console.log('Error fetching data:', error);
        }
    });
}

// General Methods

// Event Selection

// Populates the Event selection dropdown with all of the events
async function populateEventSelectionDropdown() {
    let events = await getEventNames()

    let eventSelectionDropdown = document.getElementById('event-selection')
    let select = createDropdown(await events, await events[0].name, eventSelectionDropdownOnChange)
    select.id = 'event-select'
    select.classList.add('select-event-dropdown', 'form-control')
    eventSelectionDropdown.appendChild(select)
}

// Handles the onchange event for the Event selction dropdown 
function eventSelectionDropdownOnChange(event) {
    const selectedValue = event.target.value
    EventId = selectedValue
    getEvent(EventId)
    updateSchedule()
    populateEventDetails()
}

// Grid Events

function locationAddOnClick(locationId, order) {
    addLocationToEvent(EventId, locationId, order)
}

function timeslotAddOnClick(timeslotID) {
    addTimeslotToEvent(EventId, timeslotID)
}

function locationRemoveOnClick(locationId) {
    removeLocationFromEvent(EventId, locationId)
}

function timeslotRemoveOnClick(timeslotID) {
    removeTimeslotFromEvent(EventId, timeslotID)
}

function removeWorkshopFromSessionOnClick(sessionId) {
    removeWorkshopFromSession(sessionId)
}


// Event Details
// Populates the selected events details (name and date)
async function populateEventDetails() {
    let event = await getEvent(EventId)
    let eventDetailsContainer = document.getElementById('event-details-container')
    eventDetailsContainer.classList.add('event-details')
    
    let title = document.createElement('h2')
    title.innerHTML = event.name
    title.classList.add('event-details-element')

    let date = document.createElement('p')
    date.innerHTML = formatDate(event.date)
    title.classList.add('event-details-element')

    emptyElement(eventDetailsContainer)
    eventDetailsContainer.appendChild(title)
    eventDetailsContainer.appendChild(date)
}




// Workshop Selction
// Populates the list of workshop cards
async function populateWorkshopList() {
    let queryData = {
        name: currentSearchQuery,
        description: '$~name',
        difficulty_id: selectDifficultyIds,
        tag_ids: selectedTags
    }
    let queryString = buildQueryString(queryData)
    let workshops = await getWorkshops(queryString)

    let workshopList = document.getElementById('workshop-selection-list')

    let elementList = []

    // Populate the list
    for (const workshop of workshops) {
        const workshopListBlock = document.createElement('div')
        workshopListBlock.classList.add('workshop-list-block')
        let workshopCard = await buildWorkshopCard(workshop, false)
        workshopCard.id = "drag-drop-workshop-" + workshop.id
        workshopCard.draggable = true
        workshopCard.addEventListener('dragstart', function (event) {
            drag(event, workshop.id)
        });
        workshopListBlock.appendChild(workshopCard)
        elementList.push(workshopListBlock)
    }

    // Empty the list
    emptyElement(workshopList)

    for (const element of elementList) {
        workshopList.append(element)
    }

}

// Handles updating the global reference of the selected difficulty ids
function updateDifficultyIdsList(checked, id) {
    if (checked) {
        // add To list
        if (!selectDifficultyIds.includes(id)) {
            selectDifficultyIds.push(id)
        }
    }
    else {
        // remove from list
        const index = selectDifficultyIds.indexOf(id)
        if (index > -1) {
            selectDifficultyIds.splice(index, 1)
        }
    }
}

// Populates the workshop selection tools (difficulties, tags)
async function populateWorkshopSelectionTools() {
    const workshopSelectionToolsContainer = document.getElementById('workshop-selection-tools-container')
    const difficultyLevels = await getDifficultyLevels()

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
            updateDifficultyIdsList(input.checked, level.id)
            populateWorkshopList()
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

    for(let i=0; i < 5; i++) {
        let option = document.createElement('option')
        option.value = i
        option.text = 'tag ' + i
        tagsSelect.appendChild(option)
    }

    tagsContainer.appendChild(tagsSelect)

    emptyElement(workshopSelectionToolsContainer)
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
function handleWorkshopSelectionArrows() {
    const scrollContainer = document.getElementById('workshop-selection-list');
    const leftArrow = document.getElementById('workshop-selection-list-left-arrow');
    const rightArrow = document.getElementById('workshop-selection-list-right-arrow');

    function updateArrows() {
        const scrollLeft = scrollContainer.scrollLeft;
        const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        const leftIcon = leftArrow.querySelector('svg')
        const rightIcon = rightArrow.querySelector('svg')

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
function workshopSearchOnChange() {
    let tmp = document.getElementById('workshop-search-box').value
    let filtered = tmp.replace(/[?&|=\/\\]/g, '');

    currentSearchQuery = filtered

    populateWorkshopList()
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
    scheduleGrid.currentDragType = 'workshop-add'
}

// Handles the drop event
async function drop(event) {
    if (currentDragType === 'workshop-add') {
        event.preventDefault();
        var workshopID = event.dataTransfer.getData("workshop-id");
        var sessionID = event.target.getAttribute('session-id')
        if (await addWorkshopToSession(sessionID, workshopID)) {
            await animateWorkshopDrop(event.target.id, workshopID)
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

    let eventLocations = await getLocationsForEvent(EventId);
    let eventTimeslots = await getTimeslotsForEvent(EventId);
    let eventSessions = await getSessionsForEvent(EventId);

    const columnCount = eventLocations.length + 1; // Extra column for the end button
    const rowCount = eventTimeslots.length + 1; // Extra row for the end button
    gridContainer.style.gridTemplateColumns = `100px repeat(${columnCount}, 150px)`;
    gridContainer.style.gridTemplateRows = `100px repeat(${rowCount}, 150px)`;


    // add the top-left empty cell
    let div = document.createElement('div');
    div.classList.add('header')
    gridContainer.appendChild(div);

    // add locations headers
    LocationsLength = eventLocations.length
    if (LocationsLength > 0) {
        for (const eventLocation of eventLocations) {
            LocationIds.push(eventLocation.id)
            let locationDetails = await getLocation(eventLocation.location_id)
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

            const removeButton = document.createElement('div')
            let removeIconData = await getIconData('remove')
            removeButton.innerHTML = removeIconData
            removeButton.classList.add('header-row')
            removeButton.onclick = function () {
                let confirmDeleteModal = $('#confirm-delete')
                confirmDeleteModal.modal('show')

                confirmDeleteModal.find('#confirm-delete-text').text(`
                    Any workshops assigned to ${locationDetails.name} will be removed. 
                `);

                confirmDeleteModal.find('#confirm-delete-button').off('click');

                confirmDeleteModal.find('#confirm-delete-button').click(function () {
                    removeLocationFromEvent(EventId, eventLocation.id)
                });

                return true
            }

            locationContainer.appendChild(removeButton)

            let grabHandle = document.createElement('div')
            let grabIconData = await getIconData('grab-point')
            grabHandle.innerHTML = grabIconData
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

    // add a dropdown select at the end of the header row
    const locationsDropdownCell = document.createElement('div');
    locationsDropdownCell.classList.add('header-end', 'header-top-end', 'dropdown')
    let btn = document.createElement('div')
    let iconData = await getIconData('table-add')
    btn.innerHTML = iconData
    btn.setAttribute('data-bs-toggle', 'dropdown');
    locationsDropdownCell.appendChild(btn)

    let locationNames = await getLocationNames()
    let dropdownMenu = document.createElement('div')
    dropdownMenu.className = 'dropdown-menu'
    for (const location of locationNames) {
        let a = document.createElement('a')
        a.innerHTML = location.name
        a.className = "dropdown-item"
        a.onclick = function () {
            addLocationToEvent(EventId, location.id, LocationsLength)
        }
        dropdownMenu.appendChild(a)
    }

    locationsDropdownCell.appendChild(dropdownMenu)

    //locationsDropdownCell.appendChild(CreateDropdown(await getLocationNames(), "+", LocationsDropdownOnChange));
    gridContainer.appendChild(locationsDropdownCell);

    // add Timeslots headers
    TimeslotsLength = eventTimeslots.length;
    if (TimeslotsLength > 0) {
        for (const eventTimeslot of eventTimeslots) {
            TimeslotsIds.push(eventTimeslot.id)
            let timeslotDetails = await getTimeslot(eventTimeslot.timeslot_id)
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

            let emptyTimeslotRow = document.createElement('div')
            emptyTimeslotRow.classList.add('header-row', 'header-row-spacer')
            timeslotContainer.appendChild(emptyTimeslotRow)


            const removeButton = document.createElement('div')
            let removeIconData = await getIconData('remove')
            removeButton.innerHTML = removeIconData
            removeButton.classList.add('header-row')
            removeButton.onclick = function () {
                confirmDeleteModal = $('#confirm-delete')
                confirmDeleteModal.modal('show')

                confirmDeleteModal.find('#confirm-delete-text').text(`
                    Any workshops assigned to ${timeslotDetails.name} will be removed. 
                `);

                confirmDeleteModal.find('#confirm-delete-button').off('click');

                confirmDeleteModal.find('#confirm-delete-button').click(function () {
                    removeTimeslotFromEvent(EventId, eventTimeslot.id)
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

            // add the row end empty cell
            let empty = document.createElement('div');
            empty.className = 'empty'
            gridContainer.appendChild(empty);
        }
    }

    // add a dropdown select at the end of the header row
    const TimeslotsDropdownCell = document.createElement('div');
    TimeslotsDropdownCell.classList.add('header-end', 'header-side-end')
    btn = document.createElement('div')
    let addIconData = await getIconData('table-add')
    btn.innerHTML = addIconData
    TimeslotsDropdownCell.appendChild(btn)

    let timeslotNames = await getTimeslotNames()
    dropdownMenu = document.createElement('div')
    dropdownMenu.className = 'dropdown-menu'
    for (const timeslot of timeslotNames) {
        let a = document.createElement('a')
        a.innerHTML = timeslot.name
        a.className = "dropdown-item"
        a.onclick = function () {
            addTimeslotToEvent(EventId, timeslot.id)
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
                let workshop = await getWorkshopForSession(session.id)
                let workshopCard = await buildWorkshopCard(workshop, true, session)
                sessionBlock.appendChild(workshopCard)
                sessionBlock.setAttribute('session-id', session.id)
                sessionBlock.setAttribute('workshop-id', workshop.id)
            }
        }
    }
    
    return gridContainer
}



// Sets up the event listeners to allow columns (locations) to be dragged
function setUpColumnDragEventListeners() {
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

                    locationColumnOnDrop(eventLocationId, newIndex);
                    currentDragType = ''
                }
            }
            else if (currentDragType === 'workshop-add') {
                // TODO: add logic to assign workshop to location across all timeslots
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
                    showMassPlaceWorkshopModal(sessionBlockIds, sessionIds, eventLocationId, workshopId)
                }
                else {
                    addWorkshopToMultipleSessions(sessionBlockIds, sessionIds, workshopId, false)
                }
            }
        });

    });
}

// Shows a modal warning the user about placing a workshop across a location
async function showMassPlaceWorkshopModal(sessionBlockIds, sessionIds, eventLocationId, workshopId) {
    const dangerModal = $('#mass-place-workshop-modal')
    dangerModal.modal('show')

    let eventLocation = await getEventLocation(EventId, eventLocationId)
    let location = await getLocation(eventLocation.location_id)
    let workshop = await getWorkshop(workshopId)

    dangerModal.find('.text-secondary').text(`
        ${location.name} already has workshops assigned to it. Do you want to overwrite them with ${workshop.name} or place ${workshop.name} around them?
    `);

    // remove existing event listeners to prevent duplicates
    dangerModal.find('#mass-place-workshop-overwrite').off('click');
    dangerModal.find('#mass-place-workshop-around').off('click');

    dangerModal.find('#mass-place-workshop-overwrite').click(function () {
        addWorkshopToMultipleSessions(sessionBlockIds, sessionIds, workshopId, true)
    })

    dangerModal.find('#mass-place-workshop-around').click(function () {
        addWorkshopToMultipleSessions(sessionBlockIds, sessionIds, workshopId, false)
    })
}

// Handles adding a workshop to multiple sessions
async function addWorkshopToMultipleSessions(sessionBlockIds, sessionIds, workshopId, force) {
    const addPromises = [];
    const dropPromises = [];
    let schedulePromise;

    for (let i = 0; i < sessionIds.length; i++) {
        addPromises.push(
            addWorkshopToSession(sessionIds[i], workshopId, force).then(result => ({ result, index: i }))
        );
    }

    // Wait for all addWorkshopToSession promises to complete
    let results = await Promise.all(addPromises);
    
    schedulePromise = BuildSchedule();

    // Execute the specific line of code after addWorkshopToSession calls are done
    console.log("All addWorkshopToSession calls completed");

    // Now handle AnimateWorkshopDrop based on the results
    for (const { result, index } of results) {
        if (result) {
            dropPromises.push(animateWorkshopDrop(sessionBlockIds[index], workshopId, false));
        }
    }

    // Wait for all AnimateWorkshopDrop promises to complete
    await Promise.all(dropPromises);
    const schedule = await schedulePromise;
    updateSchedule(schedule)
}

// Handles the event for when the locations selection dropdown is changed (ie: adds a location)
function LocationsDropdownOnChange(event) {
    const selectedValue = event.target.value
    addLocationToEvent(EventId, selectedValue, LocationsLength)
}

// Handles the event for when the timeslots selection dropdown is changed (ie: adds a timeslot)
function timeslotsDropdownOnChange(event) {
    const selectedValue = event.target.value
    addTimeslotToEvent(EventId, selectedValue, LocationsLength)
}

// Handles the event for when a location column has been dropped to a new order
function locationColumnOnDrop(eventLocationId, newOrder) {
    updateEventLocationOrder(EventId, eventLocationId, newOrder)
}


// Helper functions
// Creates a generic dropdown based on inputs
function createDropdown(options, defualtOptionText, onChangeFunc) {
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

// Builds a workshop card which is used to display workshops
async function buildWorkshopCard(workshop, remove = true, session = null) {
    let workshopDifficulty = null
    if (workshop.difficulty_id != null) {
        workshopDifficulty = await getDifficultyLevel(workshop.difficulty_id)
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
        let removeButton = document.createElement('div')
        let removeIconData = await getIconData('remove')
        removeButton.innerHTML = removeIconData
        let icon = removeButton.querySelector('svg')
        icon.classList.remove('icon-tabler-trash')
        icon.classList.add('icon-bin-session')
        if (session != null) {
            workshopCard.id = `session-${session.id}-workshop-${workshop.id}`
        
            removeButton.onclick = async function () {
                if (await removeWorkshopFromSession(session.id)) {
                    animateWorkshopDelete(workshopCard.id)
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
document.addEventListener("DOMContentLoaded", populateEventSelectionDropdown);
document.addEventListener("DOMContentLoaded", populateEventDetails);
document.addEventListener("DOMContentLoaded", populateWorkshopList);
document.addEventListener("DOMContentLoaded", populateWorkshopSelectionTools);
document.addEventListener("DOMContentLoaded", function () {
    let search = document.getElementById('workshop-search-box')
    search.oninput = workshopSearchOnChange
});

// Load in workshop search arrow icons
document.addEventListener("DOMContentLoaded", async function () {
    // Left
    const leftArrowContainer = document.getElementById('workshop-selection-list-left-arrow')
    let leftIconData = await getIconData('left-arrow')
    leftArrowContainer.innerHTML = leftIconData

    // Right
    const rightArrowContainer = document.getElementById('workshop-selection-list-right-arrow')
    let rightIconData = await getIconData('right-arrow')
    rightArrowContainer.innerHTML = rightIconData

    handleWorkshopSelectionArrows()
})