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
    removeTimeslotFromEvent,
    getIconData
} from './endpoints'
import { EventLocation, EventTimeslot, Location, Timeslot } from './endpoints_interfaces'
import {buildQueryString, emptyElement, allowDrop, waitForTransitionEnd} from './helper'
import {WorkshopCard, WorkshopCardOptions} from './workshop_card'

type Icons = {[key: string]: any}

interface LocationsInEvent extends Location {
    event_location_id:number
    event_location_order:number
}

interface TimeslotsInEvent extends Timeslot {
    event_timeslot_id:number
}

export interface ScheduleGridOptions {
    eventId?: number
    size?:number
    edit?:boolean
    updateInterval?:number
    workshopCardOptions?:WorkshopCardOptions
    autoScale?:boolean
    autoRefresh?:boolean
}

export class ScheduleGrid {
    private scheduleContainer:HTMLElement|null
    private options:ScheduleGridOptions = {}
    private icons:Icons
    private sessionCount:number
    private eventLocations:EventLocation[]
    private eventTimeslots:EventTimeslot[]

    public currentDragType:string


    constructor(scheduleContainerId:string, options:ScheduleGridOptions = {}) {
        // Set options (use defaults for options not provided)
        const {
            eventId = 1,
            size = 150,
            edit = false,
            updateInterval = 1,
            workshopCardOptions = {},
            autoScale = false,
            autoRefresh = true
        } = options || {}
       
        this.options = {
            eventId,
            size,
            edit,
            updateInterval,
            workshopCardOptions,
            autoScale,
            autoRefresh
        }

        // Set the schedule container element from html
        this.scheduleContainer = document.getElementById(scheduleContainerId)

        // Define variables used throughout this class
        this.icons = {}
        this.sessionCount = 0
        this.currentDragType = ''
        this.eventLocations = []
        this.eventTimeslots = []

        // Initialise the grid
        this.initialiseScheduleGrid()
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

        // Set the update grid size function to run on window resize
        window.onresize = () => {
            this.updateGridSize(this)
        }

        if (this.options.autoRefresh && this.options.updateInterval) {
            // Run populate sessions x seconds
            window.setInterval(() => {
                this.populateSessions()
            }, this.options.updateInterval * 1000)
        }
    }

    // Setup the options object for workshop cards within the grid
    setupWorkshopCardOptions() {
        // Create the options if they dont exist
        if (this.options.workshopCardOptions === null) {
            this.options.workshopCardOptions = {}
        }
        
        if (this.options.workshopCardOptions) {
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
    }

    // Do a full update of the schedule grid
    async updateSchedule() {
        if (!this.options.eventId) {
            return
        }
        // Get the locations and timeslots assigned to the event
        this.eventLocations = await getLocationsForEvent(this.options.eventId)
        this.eventTimeslots = await getTimeslotsForEvent(this.options.eventId)

        // Update the grid size variables
        this.updateGridSize()

        // Rebuild the base grid
        await this.rebuildGrid()

        // If this is an editable grid, setup the column drag events
        if (this.options.edit) {
            this.setUpColumnDragEventListeners()
        }

        // Populate the session blocks with any workshops
        await this.populateSessions()
    }

    // Allows the eventId to be updated from outside of this script
    changeEvent(newEventId:number) {
        this.options.eventId = newEventId
        this.updateSchedule()
    }

    // This preps all of the data required to build the grid
    async rebuildGrid() {
        // Make a map of the id's
        let eventLocationIds = new Set(this.eventLocations.map(location => location.location_id))
        let eventTimeslotIds = new Set(this.eventTimeslots.map(timeslot => timeslot.timeslot_id))

        // Get all the locations and timeslots
        const locations = await getLocations()
        const timeslots = await getTimeslots()

        // Build objects that combine the locations and event locations to avoid extra unnessesary server calls
        const locationsInEvent:LocationsInEvent[] = this.eventLocations
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
    
        const timeslotsInEvent:TimeslotsInEvent[] = this.eventTimeslots
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
        if (this.scheduleContainer) {
            emptyElement(this.scheduleContainer)
            this.scheduleContainer.appendChild(tmpGridContainer)
        }
    }

    // This builds the base schedule grid without any workshops
    async buildScheduleGrid(locations:LocationsInEvent[], timeslots:TimeslotsInEvent[], dropdownLocations:Location[]=[], dropdownTimeslots:Timeslot[]=[]) {
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
            header.setAttribute('event-location-id', String(location.event_location_id))
            header.setAttribute('data-index', String(location.event_location_order))
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
                sessionBlock.setAttribute('has-workshop', String(false))
                sessionBlock.setAttribute('location-column-order', String(location.event_location_order))
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
            if (!sessionBlock) {
                continue
            }
            sessionBlock.setAttribute('session-id', String(session.id))

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
            if (!this.options.workshopCardOptions.difficultyLevels) {
                const difficultyLevels = await getDifficultyLevels()
                this.options.workshopCardOptions.difficultyLevels = difficultyLevels
            }

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
                if (!sessionBlock) {
                    continue
                }

                let cardOptions = { ...this.options.workshopCardOptions, sessionId: workshop.session_id}
                let workshopCard = new WorkshopCard(workshop, cardOptions)
                let workshopCardElement = await workshopCard.element() as HTMLElement
                this.animateWorkshopDrop(sessionBlock, workshopCardElement)
                sessionBlock.setAttribute('has-workshop', String(true))
                sessionBlock.setAttribute('workshop-id', String(workshop.id))
            }
        }


        // Iterate over the workshops to remove and trigger an animation to remove them
        if (sessionWorkshopsToRemove) {
            for (const workshop of sessionWorkshopsToRemove) {
                let sessionBlock = document.getElementById(`session-${workshop.event_location_id}-${workshop.event_timeslot_id}`)
                if (!sessionBlock) {
                    continue
                }

                let workshopCard = sessionBlock.children[0] as HTMLElement
                this.animateWorkshopDelete(sessionBlock, workshopCard)
                sessionBlock.setAttribute('has-workshop', String(false))
                sessionBlock.removeAttribute('workshop-id')
                // If the grid is editable, add the drag events to the empty sessions
                if (this.options.edit) {
                    sessionBlock.removeEventListener('drop', this.handleDropWithContext)
                    sessionBlock.addEventListener('drop', this.handleDropWithContext)
                    sessionBlock.addEventListener('dragover', allowDrop);
                }
            }
        }
    }

    // Sets up the event listeners to allow columns (locations) to be dragged
    setUpColumnDragEventListeners() {
        if (!this.scheduleContainer) {
            return
        }
        // Make a map of the id's
        let eventTimeslotIds = new Set(this.eventTimeslots.map(timeslot => timeslot.id))

        let draggedColumn:HTMLElement|null = null;
        let draggedIndex:number|null = null;

        let dropIndicator = document.createElement('div');
        dropIndicator.classList.add('location-column-drop-indicator');
        dropIndicator.style.display = 'none'
        this.scheduleContainer.appendChild(dropIndicator);

        document.querySelectorAll('.header-top').forEach(grabHandle => {
            grabHandle.addEventListener('dragstart', (e:Event) => {
                // Cast the event to DragEvent
                const dragEvent = e as DragEvent;
                if (dragEvent.dataTransfer) {
                    draggedColumn = grabHandle.closest('.header-top') as HTMLElement | null
                    if (draggedColumn) {
                        draggedIndex = Number(draggedColumn.getAttribute('data-index'));

                        dragEvent.dataTransfer.effectAllowed = 'move';

                        this.currentDragType = 'column-move'

                        const eventLocationId = draggedColumn.getAttribute('event-location-id') || '';
                        dragEvent.dataTransfer.setData('event-location-id', eventLocationId);
                        
                        // Ensure grabHandle.parentElement is not null
                        const dragImageElement = grabHandle.parentElement as HTMLElement | null;
                        if (dragImageElement) {
                            dragEvent.dataTransfer.setDragImage(dragImageElement, 75, 4);
                        }
                    }
                }
            });

            grabHandle.addEventListener('dragend', () => {
                dropIndicator.style.display = 'none';
            });

            if (grabHandle.parentElement) {
                grabHandle.parentElement.addEventListener('dragover', (e:Event) => {
                    const dragEvent = e as DragEvent;
                    if (dragEvent.dataTransfer) {
                        if (this.currentDragType === 'column-move') {
                            e.preventDefault();
                            dragEvent.dataTransfer.dropEffect = 'move';
                            
                            const target = e.target as Element | null;
                            const headerTopElement = target?.closest('.header-top') as HTMLElement | null

                            if (headerTopElement) {
                                dropIndicator.style.display = 'block'
                                headerTopElement.appendChild(dropIndicator)
                            }
                        }
                    }
                });

                grabHandle.parentElement.addEventListener('drop', (e) => {
                    if (this.currentDragType === 'column-move') {
                        e.preventDefault();
                        dropIndicator.style.display = 'none';

                        const target = e.target as Element | null;
                        const headerTopElement = target?.closest('.header-top') as HTMLElement | null

                        if (headerTopElement && headerTopElement !== draggedColumn) {
                            const targetIndex = Number(headerTopElement.getAttribute('data-index'));

                            let newIndex = targetIndex

                            const dragEvent = e as DragEvent;
                            if (dragEvent.dataTransfer) {
                                let eventLocationId = Number(dragEvent.dataTransfer.getData('event-location-id'))
                                this.locationColumnDropFunc(eventLocationId, newIndex);
                            }

                            this.currentDragType = ''
                        }
                    }
                    else if (this.currentDragType === 'workshop-add') {
                        const target = e.target as Element | null;
                        const headerTopElement = target?.closest('.header-top') as HTMLElement | null
                        if (!headerTopElement) {
                            return
                        }

                        const dragEvent = e as DragEvent;
                        if (dragEvent.dataTransfer) {
                            let workshopId = Number(dragEvent.dataTransfer.getData("workshop-id"));
                            let eventLocationId = Number(headerTopElement.getAttribute('event-location-id'))

                            let sessionIds:number[] = []
                            let sessionWorkshopIds:number[] = []
                            let sessionBlockIds:string[] = []

                            for (const eventTimeslotId of eventTimeslotIds) {
                                let sessionBlockId = `session-${eventLocationId}-${eventTimeslotId}`
                                sessionBlockIds.push(sessionBlockId)
                                if (!this.scheduleContainer) {
                                    return
                                }

                                let sessionBlock = this.scheduleContainer.querySelector(`#${sessionBlockId}`)
                                if (!sessionBlock) {
                                    return
                                }

                                let sessionId = Number(sessionBlock.getAttribute('session-id'))
                                sessionIds.push(sessionId)

                                let sessionWorkshopId = Number(sessionBlock.getAttribute('workshop-id'))
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
                    }
                });
            }

        });
    }

    // Event handler for a workshop drop that includes the class context
    handleDropWithContext = (event:DragEvent) => {
        this.workshopDrop(event, this)
    }

    // Handles the drop event
    async workshopDrop(event:DragEvent, scheduleGrid:ScheduleGrid) {
        if (this.currentDragType === 'workshop-add') {
            event.preventDefault();
            const workshopID = Number(event.dataTransfer?.getData("workshop-id")) || null;
            const sessionID = Number((event.target as HTMLElement).getAttribute('session-id')) || null;
            if (!sessionID || !workshopID) {
                return
            }
            if (await addWorkshopToSession(sessionID, workshopID)) {
                await scheduleGrid.populateSessions()
            }
        }
        this.currentDragType = ''
    }

    // Handle workshop delete event
    async workshopRemoveFunc(sessionId:number, scheduleGrid:ScheduleGrid) {
        if (await removeWorkshopFromSession(sessionId)) {
            await scheduleGrid.populateSessions()
        }
    }

    // Handle locations being added to the event
    async locationAddFunc(locationId:number, order:number) {
        if (await addLocationToEvent(this.options.eventId, locationId, order)) {
            await this.updateSchedule()
        }
    }

    // Handle timeslots being added to the event
    async timeslotAddFunc(timeslotId:number) {
        if (await addTimeslotToEvent(this.options.eventId, timeslotId)) {
            await this.updateSchedule()
        }
    }

    // Handle locations being removed to the event
    async locationRemoveFunc(locationId:number) {
        if (await removeLocationFromEvent(this.options.eventId, locationId)) {
            await this.updateSchedule()
        }
    }

    // Handle timeslots being removed to the event
    async timeslotRemoveFunc(timeslotId:number) {
        if (await removeTimeslotFromEvent(this.options.eventId, timeslotId)) {
            await this.updateSchedule()
        }
    }

    // Handle locations being reordered on the schedule
    async locationColumnDropFunc(eventLocationId:number, newOrder:number) {
        if (await updateEventLocationOrder(this.options.eventId, eventLocationId, newOrder)) {
            await this.updateSchedule()
        }
    }

    // Handles the animation for when a workshop is dropped onto the scheudle
    async animateWorkshopDrop(sessionBlock:HTMLElement, workshopCard:HTMLElement) {

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
    async animateWorkshopDelete(sessionBlock:HTMLElement, workshopCard:HTMLElement) {
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
    async showMassPlaceWorkshopModal(sessionIds:number[], workshopId:number) {
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
    async addWorkshopToMultipleSessions(sessionIds:number[], workshopId:number, force:boolean) {
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

    // Update the grid size variables basied on the widnow size
    updateGridSize(scheduleGrid=this) {
        // If auto scale is enabled. Calculate the width and height params
        if (scheduleGrid.options.autoScale) {
            let oldSize = scheduleGrid.options.size
            let windowWidth = window.innerWidth
            let windowHeight = window.innerHeight
            
            // Round the width to the nearest 50px. Then take 50 px away for side padding
            let roundedWindowWidth = (50 * Math.round(windowWidth / 50)) - 50
            let roundedWindowHeight = (50 * Math.round(windowHeight / 50)) - 50

            let blockWidth = Math.round(roundedWindowWidth / scheduleGrid.eventLocations.length) - 100
            let blockHeight = Math.round(roundedWindowHeight / scheduleGrid.eventTimeslots.length) - 100

            if (scheduleGrid.options.edit) {
                blockWidth -= 100
                blockHeight -= 100
            }

            let usableWindowSize = blockWidth < blockHeight ? blockWidth : blockHeight

            scheduleGrid.options.size = usableWindowSize
            scheduleGrid.options.workshopCardOptions.size = scheduleGrid.options.size

            if (oldSize !== usableWindowSize) {
                scheduleGrid.updateSchedule()
            }
        }
    }
}