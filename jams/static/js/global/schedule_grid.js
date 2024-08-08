import {
    getLocationsForEvent,
    getTimeslotsForEvent,
    getLocations,
    getTimeslots,
    getWorkshops,
    getSessionsForEvent,
    getDifficultyLevels,
    addWorkshopToSession,
    removeWorkshopFromSession,
    addLocationToEvent,
    updateEventLocationOrder,
    addTimeslotToEvent,
    removeLocationFromEvent,
    removeTimeslotFromEvent
} from './endpoints.js'

import {buildQueryString, emptyElement, getIconData, allowDrop, waitForTransitionEnd, buildWorkshopCard} from './helper.js'
//import '../../css/general/schedule_grid.css'

export class ScheduleGrid {
    constructor(scheduleContainerId, options = {}) {
        // Set options (use defaults for options not provided)
        const {
            eventId = 1,
            size = 150,
            edit = false,
            updateInterval = 1,
            workshopCardOptions = null
        } = options
       
        this.options = {
            eventId,
            size,
            edit,
            updateInterval,
            workshopCardOptions
        }

        // Set the schedule container element from html
        this.scheduleContainer = document.getElementById(scheduleContainerId)

        // Define variables used throughout this class
        this.icons = {}
        this.sessionCount = 0
        this.currentDragType = ''

        // Initialise the grid
        this.initialiseScheduleGrid()

        // Run populate sessions x seconds
        window.setInterval(() => {
            this.populateSessions()
        }, this.options.updateInterval * 1000)
    }

    // Get the grid ready
    async initialiseScheduleGrid() {
        // Pre load in all of the icons to reduce server calls
        this.icons = {
            remove: await getIconData('remove'),
            addToGrid: await getIconData('table-add'),
            grabPoint: await getIconData('grab-point')
        }

        // Build the workshop card options based on the grid's options
        this.setupWorkshopCardOptions()

        // Build the grid
        await this.updateSchedule()
    }

    // Setup the options object for workshop cards within the grid
    setupWorkshopCardOptions() {
        // Create the options if they dont exist
        if (this.options.workshopCardOptions === null) {
            this.options.workshopCardOptions = {}
        }

        // Set if the remove button should be included (this is only true if the grid is editable)
        if (this.options.workshopCardOptions.remove === undefined) {
            this.options.workshopCardOptions.remove = this.options.edit
        }

        // Set the remove icon so it doesnt have to be loaded in every time
        if (this.options.workshopCardOptions.cardRemoveIcon === undefined) {
            this.options.workshopCardOptions.cardRemoveIcon = this.icons.remove
        }

        // Set the remove function
        if (this.options.workshopCardOptions.cardRemoveFunc === undefined) {
            this.options.workshopCardOptions.cardRemoveFunc = this.workshopRemoveFunc
        }

        // Set the current schedule grid object as an option so it can be used with some events
        if (this.options.workshopCardOptions.scheduleGrid === undefined) {
            this.options.workshopCardOptions.scheduleGrid = this
        }

        // Set the size that has been passed in for the grid as the workshop cards need to fit the session blocks
        if (this.options.workshopCardOptions.size === undefined) {
            this.options.workshopCardOptions.size = this.options.size
        }
    }

    // Do a full update of the schedule grid
    async updateSchedule() {
        // Get the locations and timeslots assigned to the event
        const eventLocations = await getLocationsForEvent(this.options.eventId)
        const eventTimeslots = await getTimeslotsForEvent(this.options.eventId)

        // Rebuild the base grid
        await this.rebuildGrid(eventLocations, eventTimeslots)

        // If this is an editable grid, setup the column drag events
        if (this.options.edit) {
            this.setUpColumnDragEventListeners(eventTimeslots)
        }

        // Populate the session blocks with any workshops
        await this.populateSessions()
    }

    // This preps all of the data required to build the grid
    async rebuildGrid(eventLocations, eventTimeslots) {
        // Make a map of the id's
        let eventLocationIds = new Set(eventLocations.map(location => location.location_id))
        let eventTimeslotIds = new Set(eventTimeslots.map(timeslot => timeslot.timeslot_id))

        // Get all the locations and timeslots
        const locations = await getLocations()
        const timeslots = await getTimeslots()

        // Build objects that combine the locations and event locations to avoid extra unnessesary server calls
        const locationsInEvent = eventLocations
        .map(eventLocation => {
            for (const location of locations) {
                if (eventLocation.location_id === location.id) {
                    return {
                        ...location,
                        'event_location_id': eventLocation.id,
                        'event_location_order': eventLocation.order
                    }
                }
            }
            return null
        })
        .filter(eventLocation => eventLocation !== null)
    
        const timeslotsInEvent = eventTimeslots
            .map(eventTimeslot => {
                for (const timeslot of timeslots) {
                    if (eventTimeslot.timeslot_id === timeslot.id) {
                        return {
                            ...timeslot,
                            'event_timeslot_id': eventTimeslot.id
                        }
                    }
                }
                return null
            })
            .filter(eventTimeslot => eventTimeslot !== null)
        
        // Work out what locations/timeslots need to be in the add dropdown (if any)
        const locationsForAddDropdown = locations
            .filter(location => !eventLocationIds.has(location.id) )
        
        const timeslotsForAddDropdown = timeslots
            .filter(timeslot => !eventTimeslotIds.has(timeslot.id))
        
        // Build the grid
        let tmpGridContainer = await this.buildScheduleGrid(
            locationsInEvent,
            timeslotsInEvent,
            locationsForAddDropdown,
            timeslotsForAddDropdown,
        )

        // Set the new grid
        emptyElement(this.scheduleContainer)
        this.scheduleContainer.appendChild(tmpGridContainer)
    }

    // This builds the base schedule grid without any workshops
    async buildScheduleGrid(locations, timeslots, dropdownLocations=null, dropdownTimeslots=null) {
        // Set the session count back to 0
        this.sessionCount = 0

        // Create a grid container which will be the basis of the grid
        const gridContainer = document.createElement('div')
        gridContainer.id = 'grid-container'
        gridContainer.classList.add('grid-container')

        // Work out the base column and row counts for grid sizing
        const columnCount = locations.length
        const rowCount = timeslots.length

        // Set the number of columns in the grid. There is only one row
        if (locations.length > 0) {
            gridContainer.style.gridTemplateColumns = `100px repeat(${columnCount}, ${this.options.size}px) 100px`
        } else {
            gridContainer.style.gridTemplateColumns = '100px 100px'
        }
        
        // Craete the timeslots column including an empty square for the top left corner
        const timeslotsColumn = document.createElement('div')
        timeslotsColumn.style.gridTemplateColumns = `100px`
        timeslotsColumn.style.gridTemplateRows = `100px repeat(${rowCount}, ${this.options.size}px) 100px`

        let emptyCornerCell = document.createElement('div')
        emptyCornerCell.classList.add('header')
        emptyCornerCell.style.width = '100px'
        emptyCornerCell.style.height = '100px'
        timeslotsColumn.appendChild(emptyCornerCell)

        // Iterate over all of the timeslots in the event
        for (const timeslot of timeslots) {
            // Build the timeslot element
            let div = document.createElement('div');
            div.classList.add('header', 'header-side');
            div.style.height = `${this.options.size}px`

            const timeslotContainer = document.createElement('div')
            timeslotContainer.classList.add('header-container')

            let timeslotName = document.createElement('p')
            timeslotName.classList.add('header-row')
            timeslotName.innerText = timeslot.name
            timeslotContainer.appendChild(timeslotName)

            let timeslotRange = document.createElement('p')
            timeslotRange.classList.add('header-row', 'timeslot-range')
            timeslotRange.innerText = timeslot.range
            timeslotContainer.appendChild(timeslotRange)

            let emptyTimeslotRow = document.createElement('div')
            emptyTimeslotRow.classList.add('header-row', 'header-row-spacer')
            timeslotContainer.appendChild(emptyTimeslotRow)

            // If the grid is editable, add a remove button
            if (this.options.edit) {
                const removeButton = document.createElement('div')
                removeButton.innerHTML = this.icons.remove
                removeButton.classList.add('header-row')
                removeButton.onclick = () => {
                    let confirmDeleteModal = $('#confirm-delete')
                    confirmDeleteModal.modal('show')

                    confirmDeleteModal.find('#confirm-delete-text').text(`
                        Any workshops assigned to ${timeslot.name} will be removed. 
                    `);

                    confirmDeleteModal.find('#confirm-delete-button').off('click');

                    confirmDeleteModal.find('#confirm-delete-button').click(() => {
                        this.timeslotRemoveFunc(timeslot.event_timeslot_id)
                    });

                    return true
                }

                timeslotContainer.appendChild(removeButton)
            }

            div.appendChild(timeslotContainer)

            // Add the timeslot to the timeslots column
            timeslotsColumn.appendChild(div)
        }

        // If the grid is editable and their are other timeslots to add, show the add timeslot button at the end
        if (this.options.edit) {
            if (dropdownTimeslots.length > 0) {
                const timeslotsDropdownCell = document.createElement('div');
                timeslotsDropdownCell.classList.add('header-end', 'header-side-end')
                let btn = document.createElement('div')
                btn.innerHTML = this.icons.addToGrid
                btn.setAttribute('data-bs-toggle', 'dropdown');
                timeslotsDropdownCell.appendChild(btn)

                let dropdownMenu = document.createElement('div')
                dropdownMenu.className = 'dropdown-menu'
                for (const timeslot of dropdownTimeslots) {
                    let a = document.createElement('a')
                    a.innerHTML = timeslot.name
                    a.className = "dropdown-item"
                    a.onclick = () =>{
                        this.timeslotAddFunc(timeslot.id)
                    }
                    dropdownMenu.appendChild(a)
                }

                timeslotsDropdownCell.appendChild(dropdownMenu)
                timeslotsColumn.appendChild(timeslotsDropdownCell)
            }
        }

        gridContainer.appendChild(timeslotsColumn)

        // Iterate over all of the locations in the event
        for (const location of locations) {
            // Craete the main columns in the grid which will have each location and all its session blocks
            const mainColumn = document.createElement('div')
            mainColumn.style.gridTemplateColumns = `${this.options.size}px`
            mainColumn.style.gridTemplateRows = `100px repeat(${rowCount}, ${this.options.size}px)`

            // Create the header and add the drag over events
            let header = document.createElement('div');
            header.setAttribute('event-location-id', location.event_location_id)
            header.setAttribute('data-index', location.event_location_order)
            header.classList.add('header', 'header-top');
            header.style.width = `${this.options.size}px`
            if (this.options.edit) {
                header.addEventListener('dragover', allowDrop);
            }

            const locationContainer = document.createElement('div')
            locationContainer.classList.add('header-container')

            let locationName = document.createElement('p')
            locationName.classList.add('header-row')
            locationName.innerText = location.name
            locationContainer.appendChild(locationName)

            // If the grid is editable, add the remove button to the location header
            if (this.options.edit) {
                const removeButton = document.createElement('div')
                removeButton.innerHTML = this.icons.remove
                removeButton.classList.add('header-row')
                removeButton.onclick = () => {
                    let confirmDeleteModal = $('#confirm-delete')
                    confirmDeleteModal.modal('show')

                    confirmDeleteModal.find('#confirm-delete-text').text(`
                        Any workshops assigned to ${location.name} will be removed. 
                    `);

                    confirmDeleteModal.find('#confirm-delete-button').off('click');

                    confirmDeleteModal.find('#confirm-delete-button').click(() => {
                        this.locationRemoveFunc(location.event_location_id)
                    });

                    return true
                }

                locationContainer.appendChild(removeButton)

                // Build the elements to allow the ability to drag the location columns to reorder
                let grabHandle = document.createElement('div')
                grabHandle.innerHTML = this.icons.grabPoint
                grabHandle.classList.add('location-column-grab-container', 'location-column-grab-container-style')
                let width = this.options.size / 5
                grabHandle.style.width = `${width}px`
                grabHandle.style.marginLeft = `${(this.options.size - width) / 2}px`
                grabHandle.style.display = 'none'

                header.addEventListener('mouseover', (e) => {
                    grabHandle.style.display = 'block'
                });

                header.addEventListener('mouseleave', (e) => {
                    grabHandle.style.display = 'none'
                });

                header.appendChild(grabHandle)
            }

            header.appendChild(locationContainer)

            mainColumn.appendChild(header)

            // Create cells for each session
            for (const timeslot of timeslots) {
                const sessionBlock = document.createElement('div');
                sessionBlock.classList.add('session-block', 'session-block-style')
                sessionBlock.id = `session-${location.event_location_id}-${timeslot.event_timeslot_id}`
                sessionBlock.style.width = `${this.options.size}px`
                sessionBlock.style.height = `${this.options.size}px`
                sessionBlock.setAttribute('has-workshop', false)
                sessionBlock.setAttribute('location-column-order', location.event_location_order)
                mainColumn.appendChild(sessionBlock);
                // Increment the session count of the grid
                this.sessionCount ++
            }

            // Add the column to the grid container
            gridContainer.appendChild(mainColumn)
        }

        // Add location dropdown column if the grid is editable
        if (this.options.edit) {
            if (dropdownLocations.length > 0) {
                const addLocationsColumn = document.createElement('div')
                addLocationsColumn.style.gridTemplateColumns = '100px'
                addLocationsColumn.style.gridTemplateRows = `${this.options.size}px`

                const locationsDropdownCell = document.createElement('div');
                locationsDropdownCell.classList.add('header-end', 'header-top-end', 'dropdown')
                let btn = document.createElement('div')
                btn.innerHTML = this.icons.addToGrid
                btn.setAttribute('data-bs-toggle', 'dropdown');
                locationsDropdownCell.appendChild(btn)

                let dropdownMenu = document.createElement('div')
                dropdownMenu.className = 'dropdown-menu'
                for (const location of dropdownLocations) {
                    let a = document.createElement('a')
                    a.innerHTML = location.name
                    a.className = "dropdown-item"
                    a.onclick = () => {
                        this.locationAddFunc(location.id, locations.length)
                    }
                    dropdownMenu.appendChild(a)
                }

                locationsDropdownCell.appendChild(dropdownMenu)
                addLocationsColumn.appendChild(locationsDropdownCell)

                gridContainer.appendChild(addLocationsColumn)
            }
        }

        // Return the grid container
        return gridContainer
    }

    // Populate the session blocks with workshops that are assigned to them
    async populateSessions() {
        // Get all the sessions for the given event
        const sessions = await getSessionsForEvent(this.options.eventId)

        // If the grid session count is not equal to the length of the sessions justed pulled down, reload the grid
        if (this.sessionCount != sessions.length) {
            await this.updateSchedule()
            return
        }

        let sessionWorkshopsToAdd = []
        let sessionWorkshopsToRemove = []

        // Iterate over the sessions
        for (const session of sessions) {
            let sessionBlock = document.getElementById(`session-${session.event_location_id}-${session.event_timeslot_id}`)
            sessionBlock.setAttribute('session-id', session.id)

            // If a session block says it's order is different from what the DB's session says it is, reload the grid
            if (sessionBlock.getAttribute('location-column-order') !== String(session.location_column_order)) {
                await this.updateSchedule()
                return
            }

            // If the session block says it doesnt have a workshop, but the DB says it should, set that session to add a workshop
            let sessionBlockHasWorkshop = sessionBlock.getAttribute('has-workshop') == 'true'
            if (!sessionBlockHasWorkshop && session.has_workshop) {
                sessionWorkshopsToAdd.push(session)
            }
            else if (sessionBlockHasWorkshop && !session.has_workshop) {
                // If the session block says it has a workshop, but the DB says it shouldn't, set that session to have its workshop removed
                sessionWorkshopsToRemove.push(session)
            }

            // If the session block says it has a specific workshop in it, but the DB says it should have a different one, set that session to be updated
            if (sessionBlockHasWorkshop) {
                let sessionWorkshopId = sessionBlock.getAttribute('workshop-id')
                if (sessionWorkshopId !== String(session.workshop_id)) {
                    sessionWorkshopsToAdd.push(session)
                }
            }


            // If the grid is editable, add the drag events to the empty sessions
            if (this.options.edit) {
                if (!session.has_workshop && !sessionWorkshopsToAdd.includes(session)) {
                    sessionBlock.removeEventListener('drop', this.handleDropWithContext)
                    sessionBlock.addEventListener('drop', this.handleDropWithContext)
                    sessionBlock.addEventListener('dragover', allowDrop);
                }
            }
        }

        // Generate the objects for the workshops to add to avoid doing extra unnessessary server calls
        let workshopsToAddIds = sessionWorkshopsToAdd.map(sw => sw.workshop_id)
        let workshopsQueryData = {
            id: workshopsToAddIds
        }
        let workshopsQueryString = buildQueryString(workshopsQueryData)

        if (sessionWorkshopsToAdd.length > 0) {
            const workshops = await getWorkshops(workshopsQueryString)
            const difficultyLevels = await getDifficultyLevels()

            const workshopsToAdd = sessionWorkshopsToAdd
                .map(sw => {
                    for (const workshop of workshops) {
                        if (sw.workshop_id === workshop.id) {
                            return {
                                ...workshop,
                                'event_location_id': sw.event_location_id,
                                'event_timeslot_id': sw.event_timeslot_id,
                                'session_id': sw.id
                            }
                        }
                    }
                    return null
                })
                .filter(sw => sw != null)

            // Iterate over each workshop to be added and trigger an animation to set the workshop
            for (const workshop of workshopsToAdd) {
                let sessionBlock = document.getElementById(`session-${workshop.event_location_id}-${workshop.event_timeslot_id}`)
                let workshopCard = await buildWorkshopCard(workshop, workshop.session_id, difficultyLevels, this.options.workshopCardOptions)
                this.animateWorkshopDrop(sessionBlock, workshopCard)
                sessionBlock.setAttribute('has-workshop', true)
                sessionBlock.setAttribute('workshop-id', workshop.id)
            }
        }


        // Iterate over the workshops to remove and trigger an animation to remove them
        if (sessionWorkshopsToRemove) {
            for (const workshop of sessionWorkshopsToRemove) {
                let sessionBlock = document.getElementById(`session-${workshop.event_location_id}-${workshop.event_timeslot_id}`)
                let workshopCard = sessionBlock.children[0]
                this.animateWorkshopDelete(sessionBlock, workshopCard)
                sessionBlock.setAttribute('has-workshop', false)
                sessionBlock.removeAttribute('workshop-id')
            }
        }
    }

    // Sets up the event listeners to allow columns (locations) to be dragged
    setUpColumnDragEventListeners(eventTimeslots) {
        // Make a map of the id's
        let eventTimeslotIds = new Set(eventTimeslots.map(timeslot => timeslot.id))

        let draggedColumn = null;
        let draggedIndex = null;
        let dropIndicator = document.createElement('div');
        dropIndicator.classList.add('location-column-drop-indicator');
        dropIndicator.style.display = 'none'
        this.scheduleContainer.appendChild(dropIndicator);

        document.querySelectorAll('.header-top').forEach(grabHandle => {
            grabHandle.addEventListener('dragstart', (e) => {
                draggedColumn = grabHandle.closest('.header-top');
                draggedIndex = Number(draggedColumn.getAttribute('data-index'));
                e.dataTransfer.effectAllowed = 'move';

                this.currentDragType = 'column-move'

                e.dataTransfer.setData('event-location-id', draggedColumn.getAttribute('event-location-id'))
                e.dataTransfer.setDragImage(grabHandle.parentElement, 75, 4)
            });

            grabHandle.addEventListener('dragend', () => {
                dropIndicator.style.display = 'none';
            });

            grabHandle.parentElement.addEventListener('dragover', (e) => {
                if (this.currentDragType === 'column-move') {
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
                if (this.currentDragType === 'column-move') {
                    e.preventDefault();
                    dropIndicator.style.display = 'none';
                    const target = e.target.closest('.header-top');
                    if (target && target !== draggedColumn) {
                        const targetIndex = Number(target.getAttribute('data-index'));

                        let newIndex = targetIndex

                        let eventLocationId = e.dataTransfer.getData('event-location-id')

                        this.locationColumnDropFunc(eventLocationId, newIndex);
                        this.currentDragType = ''
                    }
                }
                else if (this.currentDragType === 'workshop-add') {
                    const target = e.target.closest('.header-top');
                    let workshopId = e.dataTransfer.getData("workshop-id");
                    let eventLocationId = Number(target.getAttribute('event-location-id'))

                    let sessionIds = []
                    let sessionWorkshopIds = []
                    let sessionBlockIds = []

                    for (const eventTimeslotId of eventTimeslotIds) {
                        let sessionBlockId = `session-${eventLocationId}-${eventTimeslotId}`
                        sessionBlockIds.push(sessionBlockId)
                        let sessionBlock = this.scheduleContainer.querySelector(`#${sessionBlockId}`)
                        let sessionId = sessionBlock.getAttribute('session-id')
                        sessionIds.push(sessionId)

                        let sessionWorkshopId = sessionBlock.getAttribute('workshop-id')
                        if (sessionWorkshopId != null) {
                            sessionWorkshopIds.push(sessionWorkshopId)
                        }
                    }

                    if (sessionWorkshopIds.length > 0) {
                        this.showMassPlaceWorkshopModal(sessionIds, workshopId)
                    }
                    else {
                        this.addWorkshopToMultipleSessions(sessionIds, workshopId, false)
                    }
                }
            });

        });
    }

    // Event handler for a workshop drop that includes the class context
    handleDropWithContext = (event) => {
        this.workshopDrop(event, this)
    }

    // Handles the drop event
    async workshopDrop(event, scheduleGrid) {
        if (this.currentDragType === 'workshop-add') {
            event.preventDefault();
            var workshopID = event.dataTransfer.getData("workshop-id");
            var sessionID = event.target.getAttribute('session-id')
            if (await addWorkshopToSession(sessionID, workshopID)) {
                await scheduleGrid.populateSessions()
            }
        }
        this.currentDragType = ''
    }

    // Handle workshop delete event
    async workshopRemoveFunc(sessionId, scheduleGrid=null) {
        if (await removeWorkshopFromSession(sessionId)) {
            await scheduleGrid.populateSessions()
        }
    }

    // Handle locations being added to the event
    async locationAddFunc(locationId, order) {
        if (await addLocationToEvent(this.options.eventId, locationId, order)) {
            await this.updateSchedule()
        }
    }

    // Handle timeslots being added to the event
    async timeslotAddFunc(timeslotId) {
        if (await addTimeslotToEvent(this.options.eventId, timeslotId)) {
            await this.updateSchedule()
        }
    }

    // Handle locations being removed to the event
    async locationRemoveFunc(locationId) {
        if (await removeLocationFromEvent(this.options.eventId, locationId)) {
            await this.updateSchedule()
        }
    }

    // Handle timeslots being removed to the event
    async timeslotRemoveFunc(timeslotId) {
        if (await removeTimeslotFromEvent(this.options.eventId, timeslotId)) {
            await this.updateSchedule()
        }
    }

    // Handle locations being reordered on the schedule
    async locationColumnDropFunc(eventLocationId, newOrder) {
        if (await updateEventLocationOrder(this.options.eventId, eventLocationId, newOrder)) {
            await this.updateSchedule()
        }
    }

    // Handles the animation for when a workshop is dropped onto the scheudle
    async animateWorkshopDrop(sessionBlock, workshopCard) {

        workshopCard.classList.add('workshop-card-animate-shrink', 'workshop-card-animate')
        emptyElement(sessionBlock)
        sessionBlock.appendChild(workshopCard)

        // Trigger a reflow to ensure initial styles are applied
        workshopCard.offsetHeight; // Forces a reflow

        requestAnimationFrame(() => {
            workshopCard.classList.add('workshop-card-animate-grow')
        })

        await waitForTransitionEnd(workshopCard);
        workshopCard.classList.remove('workshop-card-animate-shrink', 'workshop-card-animate', 'workshop-card-animate-grow')
    }

    // Handles the animation for when a workshop is deleted from the schedule
    async animateWorkshopDelete(sessionBlock, workshopCard) {
        workshopCard.classList.add('workshop-card-animate')

        // Trigger a reflow to ensure initial styles are applied
        workshopCard.offsetHeight; // Forces a reflow

        requestAnimationFrame(() => {
            workshopCard.classList.add('workshop-card-animate-shrink')
        })

        await waitForTransitionEnd(workshopCard);
        emptyElement(sessionBlock)
    }

    // Shows a modal warning the user about placing a workshop across a location
    async showMassPlaceWorkshopModal(sessionIds, workshopId) {
        const dangerModal = $('#mass-place-workshop-modal')
        dangerModal.modal('show')

        dangerModal.find('.text-secondary').text('This location already has workshops assigned to it. Do you want to overwrite them or place around them?');

        // remove existing event listeners to prevent duplicates
        dangerModal.find('#mass-place-workshop-overwrite').off('click');
        dangerModal.find('#mass-place-workshop-around').off('click');

        dangerModal.find('#mass-place-workshop-overwrite').click(() => {
            this.addWorkshopToMultipleSessions(sessionIds, workshopId, true)
        })

        dangerModal.find('#mass-place-workshop-around').click(() => {
            this.addWorkshopToMultipleSessions(sessionIds, workshopId, false)
        })
    }

    // Handles adding a workshop to multiple sessions
    async addWorkshopToMultipleSessions(sessionIds, workshopId, force) {
        const addPromises = [];

        for (let i = 0; i < sessionIds.length; i++) {
            addPromises.push(
                addWorkshopToSession(sessionIds[i], workshopId, force).then(result => ({ result, index: i }))
            );
        }

        // Wait for all addWorkshopToSession promises to complete
        await Promise.all(addPromises);

        this.populateSessions()
    }
}