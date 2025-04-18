import {
    getLocationsForEvent,
    getTimeslotsForEvent,
    getLocations,
    getTimeslots,
    getWorkshops,
    getDifficultyLevels,
    addWorkshopToSession,
    removeWorkshopFromSession,
    addLocationToEvent,
    updateEventLocationOrder,
    addTimeslotToEvent,
    removeLocationFromEvent,
    removeTimeslotFromEvent,
    getIconData,
    getWorkshopTypes,
    removeVolunteerSignup,
    addVolunteerSignup,
    getWorkshopField,
    recalculateSessionCapacity,
    updateSessionSettings,
    getEventMetadata
} from '@global/endpoints'
import { AttendeeSignup, DifficultyLevel, EventLocation, EventMetadata, EventTimeslot, Location, Session, sessionSettings, Timeslot, User, VolunteerSignup, Workshop, WorkshopType } from '@global/endpoints_interfaces'
import {buildQueryString, emptyElement, allowDrop, waitForTransitionEnd, debounce, successToast, errorToast, buildUserAvatar, preloadUsersInfoMap, animateElement, isTouchDevice, hexToRgba, isNullEmptyOrSpaces, cloneMap} from '@global/helper'
import {WorkshopCard, WorkshopCardOptions} from '@global/workshop_card'
import { QueryStringData, ScheduleGridTimeslotCapacity } from './interfaces'
import { addTooltipToElement, buildUserTooltip, hideAllTooltips } from './tooltips'
import { getLiveAttendeeSignups, getLiveEventSessions, getLiveVolunteerSignups } from './sse_endpoints'
import { SSEManager } from './sse_manager'

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
    userId?:number
    width?:number
    height?:number
    size?:number
    minSize?:number
    edit?:boolean
    workshopCardOptions?:WorkshopCardOptions
    autoScale?:boolean
    autoResize?:boolean
    showPrivate?:boolean
    showVolunteerSignup?:boolean
    volunteerSignup?:boolean
    showAttendeeSignupCounts?:boolean
    userInfoMap?:Record<number, Partial<User>>
    buildKey?:boolean
}

export class ScheduleGrid {
    private scheduleContainer:HTMLElement|null
    private options:ScheduleGridOptions = {}
    private icons:Icons
    private eventSessions:Session[] = []
    private sessionCount:number
    private eventLocations:EventLocation[]
    private eventTimeslots:EventTimeslot[]
    private locationsInEvent:LocationsInEvent[]
    private timeslotsInEvent:TimeslotsInEvent[]

    private volunteerSignupsMap:Record<number, Set<number>> = {}
    private volunteerSignupsMapOLD:Record<number, Set<number>> = {}
    private attendeeSignupCountsMap:Record<number, number> = {}
    private attendeeSignupCountsMapOLD:Record<number, number> = {}
    private usersInfoMap:Record<number, Partial<User>> = {}
    private sessionsMap:Record<number, Session> = {}
    private SessionsMapOLD:Record<number, Session> = {}
    private timeslotCapacityMap:Record<number, ScheduleGridTimeslotCapacity> = {}

    private difficultyLevels:DifficultyLevel[]
    private workshopTypes:WorkshopType[]
    private workshopsMap:Record<number, Workshop> = {}

    public currentDragType:string
    public scheduleValid:boolean
    public fatalError:boolean

    private eventMetadata:EventMetadata;
    private gridInitialised:boolean = false

    // SSE handlers
    private sessionsSSEHandler:SSEManager<[Session]> = null
    private volunteerSignupsSSEHandler:SSEManager<[VolunteerSignup]> = null
    private attendeeSignupsSSEHandler:SSEManager<[AttendeeSignup]> = null


    constructor(scheduleContainerId:string, options:ScheduleGridOptions = {}) {
        // Set options (use defaults for options not provided)
        const {
            eventId = 1,
            userId = 1,
            width = 150,
            height = 150,
            size = 150,
            minSize = 150,
            edit = false,
            workshopCardOptions = {},
            autoScale = false,
            autoResize = false,
            showPrivate = true,
            showVolunteerSignup = false,
            volunteerSignup = false,
            showAttendeeSignupCounts = false,
            userInfoMap = {},
            buildKey = false
        } = options || {}
       
        this.options = {
            eventId,
            userId,
            width,
            height,
            size,
            minSize,
            edit,
            workshopCardOptions,
            autoScale,
            autoResize,
            showPrivate,
            showVolunteerSignup,
            volunteerSignup,
            showAttendeeSignupCounts,
            userInfoMap,
            buildKey
        }

        // Set the schedule container element from html
        this.scheduleContainer = document.getElementById(scheduleContainerId)

        // Define variables used throughout this class
        this.icons = {}
        this.sessionCount = 0
        this.currentDragType = ''
        this.eventLocations = []
        this.eventTimeslots = []
        this.locationsInEvent = []
        this.timeslotsInEvent = []

        this.scheduleValid = true
        this.fatalError = false

        // Set width and height if size is set
        if (this.options.size !== null && this.options.size !== undefined) {
            this.options.width = this.options.size
            this.options.height = this.options.size
        }

        if (window.innerWidth < 500) {
            this.options.autoResize = false
            this.options.autoScale = false
        }
    }

    // Clear resources and clean up if you ever need to reinitialise schedule grid
    public teardown() {
        this.scheduleContainer = null
        this.options = null
        this.icons = null
        this.sessionCount = null
        this.eventLocations = null
        this.eventTimeslots = null
        this.locationsInEvent = null
        this.timeslotsInEvent = null
        this.volunteerSignupsMap = null
        this.usersInfoMap = null
        this.currentDragType = null
        this.scheduleValid = null
        this.fatalError = false
        this.teardownSSEHandlers()
    }

    // Get the grid ready
    async init(reInit:boolean=false) {
        this.gridInitialised = false
        if (this.options.edit) {
            this.eventMetadata = (await getEventMetadata(this.options.eventId)).data
        }

        if (isTouchDevice() && this.options.edit) {
            // Editing is currently not available on touch devices due to drag and drop not working well on them
            // TODO: Add mobile friendly way to edit the schedule

            let tmpGridContainer = document.createElement('div')
            tmpGridContainer.classList.add('center-container')
            
            let warningTitle = document.createElement('h4')
            warningTitle.classList.add('error-text')
            warningTitle.innerHTML = 'Editing the event schedule is not currently supported on touch devices'

            let searchIconData = await getIconData('touch')
            let iconContainer = document.createElement('div')
            iconContainer.innerHTML = searchIconData

            let icon = iconContainer.querySelector('svg')
            icon.classList.remove('icon-tabler-hand-click')
            icon.classList.add('icon-touch-grid')

            let homeButton = document.createElement('a') as HTMLAnchorElement
            homeButton.classList.add('btn', 'btn-primary', 'mb-3')
            homeButton.innerHTML = await getIconData('home')
            homeButton.href = '/private'

            let homeText = document.createElement('span')
            homeText.classList.add('btn-text')
            homeText.innerHTML = 'Go back Home'
            homeButton.appendChild(homeText)


            tmpGridContainer.appendChild(iconContainer)
            tmpGridContainer.appendChild(warningTitle)
            tmpGridContainer.appendChild(homeButton)

            this.scheduleContainer.appendChild(tmpGridContainer)

            animateElement(tmpGridContainer, 'warning-error-shake')
            this.fatalError = true
            return
        }

        if (!reInit) {
            // Pre load in all of the icons to reduce server calls
            this.icons = {
                remove: await getIconData('remove'),
                settings: await getIconData('settings'),
                addToGrid: await getIconData('table-add'),
                grabPoint: await getIconData('grab-point'),
                userAdd: await getIconData('user-add'),
                userRemove: await getIconData('user-remove')
            }
        }

        if (this.options.volunteerSignup) {
            // Preload users Info Map
            if (Object.keys(this.options.userInfoMap).length <= 0) {
                this.usersInfoMap = await preloadUsersInfoMap()
            } else {
                this.usersInfoMap = this.options.userInfoMap
            }
        }

        // Preload difficulty levels and workshop types
        const dLResponse = await getDifficultyLevels()
        this.difficultyLevels = dLResponse.data

        const wTResponse = await getWorkshopTypes()
        this.workshopTypes = wTResponse.data

        // Build the workshop card options based on the grid's options
        this.setupWorkshopCardOptions()

        // Start SSE handlers
        await this.initialiseSSEHandlers()

        // Build the grid
        await this.updateSchedule()

        if (!reInit) {
            // Set the update grid size function to run on window resize
            if (this.options.autoResize) {
                window.onresize = () => {
                    this.updateGridSize(this)
                }
            }
        }

        if (this.options.edit) {
            this.scheduleContainer.style.paddingLeft = '0'
        }

        this.gridInitialised = true
    }

    teardownSSEHandlers() {
        this.sessionsSSEHandler?.stop()
        this.volunteerSignupsSSEHandler?.stop()
        this.attendeeSignupsSSEHandler?.stop()
    }

    async initialiseSSEHandlers(): Promise<void> {
        // Clean up old SSE handlers
        this.teardownSSEHandlers()

        const promises: Promise<void>[] = []

        // Start the sessions SSE
        const sessionsPromise = new Promise<void>((resolve) => {
            const queryData = {
                show_private: this.options.showPrivate,
                '$all_rows': true
            }
            this.sessionsSSEHandler = getLiveEventSessions(this.options.eventId, queryData)
            this.sessionsSSEHandler.onUpdate((data) => {
                this.eventSessions = data
                for (const session of this.eventSessions) {
                    this.sessionsMap[session.id] = session
                }
                this.SessionsMapOLD = cloneMap(this.sessionsMap, (session) => ({ ...session }))
                
                if (this.gridInitialised) {
                    this.populateSessions()
                }

                resolve()
            })
        })
        promises.push(sessionsPromise)

        if (this.options.volunteerSignup) {
            // Start volunteer signups SSE
            const volunteerPromise = new Promise<void>((resolve) => {
                this.volunteerSignupsSSEHandler = getLiveVolunteerSignups(this.options.eventId)
                this.volunteerSignupsSSEHandler.onUpdate((data) => {
                    this.volunteerSignupsMapOLD = cloneMap(this.volunteerSignupsMap, (set) => new Set(set))

                    this.volunteerSignupsMap = {}
                    data.forEach(signup => {
                        if (!this.volunteerSignupsMap[signup.session_id]) {
                            this.volunteerSignupsMap[signup.session_id] = new Set()
                        }
                        this.volunteerSignupsMap[signup.session_id].add(signup.user_id)
                    })

                    if (this.gridInitialised) {
                        this.populateSessions()
                    }

                    resolve()
                })
            })
            promises.push(volunteerPromise)
        }

        if (this.options.showAttendeeSignupCounts) {
            // Start attendee signups SSE
            const attendeePromise = new Promise<void>((resolve) => {
                this.attendeeSignupsSSEHandler = getLiveAttendeeSignups(this.options.eventId)
                this.attendeeSignupsSSEHandler.onUpdate((data) => {
                    this.attendeeSignupCountsMapOLD = cloneMap(this.attendeeSignupCountsMap)

                    this.attendeeSignupCountsMap = {}
                    data.forEach(signup => {
                        if (!this.attendeeSignupCountsMap[signup.session_id]) {
                            this.attendeeSignupCountsMap[signup.session_id] = 0
                        }

                        this.attendeeSignupCountsMap[signup.session_id]++
                    })

                    if (this.gridInitialised) {
                        this.populateSessions()
                    }

                    resolve()
                })
            })
            promises.push(attendeePromise)
        }

        await Promise.all(promises)
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

            // Set if the settings button should be included (this is only true if the grid is editable)
            if (this.options.workshopCardOptions.settings === undefined) {
                this.options.workshopCardOptions.settings = this.options.edit
            }

            // Set the remove icon so it doesnt have to be loaded in every time
            if (this.options.workshopCardOptions.cardRemoveIcon === undefined) {
                this.options.workshopCardOptions.cardRemoveIcon = this.icons.remove
            }

            // Set the settings icon so it doesnt have to be loaded in every time
            if (this.options.workshopCardOptions.cardSettingsIcon === undefined) {
                this.options.workshopCardOptions.cardSettingsIcon = this.icons.settings
            }

            // Set the remove function
            if (this.options.workshopCardOptions.cardRemoveFunc === undefined) {
                this.options.workshopCardOptions.cardRemoveFunc = this.workshopRemoveFunc
            }

            // Set the settings function
            if (this.options.workshopCardOptions.cardSettingsFunc === undefined) {
                this.options.workshopCardOptions.cardSettingsFunc = this.sessionSettingsFunc
            }

            // Set the current schedule grid object as an option so it can be used with some events
            if (this.options.workshopCardOptions.scheduleGrid === undefined) {
                this.options.workshopCardOptions.scheduleGrid = this
            }

            // Set the size that has been passed in for the grid as the workshop cards need to fit the session blocks
            if (this.options.workshopCardOptions.width === undefined) {
                this.options.workshopCardOptions.width = this.options.width
            }
            if (this.options.workshopCardOptions.height === undefined) {
                this.options.workshopCardOptions.height = this.options.height
            }

            // Show the attendance count if the grid is not editable or showing volunteer attendance
            if (this.options.workshopCardOptions.showAttendeeSignupCounts === undefined) {
                this.options.workshopCardOptions.showAttendeeSignupCounts = this.options.showAttendeeSignupCounts
            }
        }
    }

    // Do a full update of the schedule grid
    async updateSchedule() {
        if (this.fatalError) {
            return
        }

        if (!this.options.eventId) {
            return
        }
        // Get the locations and timeslots assigned to the event
        this.eventLocations = await getLocationsForEvent(this.options.eventId)
        this.eventTimeslots = await getTimeslotsForEvent(this.options.eventId)

        // Rebuild the base grid
        await this.rebuildGrid()

        // If this is an editable grid, setup the column drag events
        if (this.options.edit) {
            this.setUpColumnDragEventListeners()
        }

        // Populate the session blocks with any workshops
        await this.populateSessions()
    }

    // Allows the eventId to be updated from outside of this module
    async changeEvent(newEventId:number) {
        this.options.eventId = newEventId
        this.volunteerSignupsMap = {}
        this.initialiseSSEHandlers()
        this.updateSchedule()

    }

    // Allows the selected userId to be updated from outside of this module
    changeSelectedUser(newUserId:number) {
        this.options.userId = newUserId
        this.updateSchedule()
    }

    // Allows the options to be updated from outside of this module
    async updateOptions(newOptions:Partial<ScheduleGridOptions>) {
        this.options = {...this.options, ...newOptions}
        await this.init(true)
    }

    // This preps all of the data required to build the grid
    async rebuildGrid() {
        // Make a map of the id's
        let eventLocationIds = new Set(this.eventLocations.map(location => location.location_id))
        let eventTimeslotIds = new Set(this.eventTimeslots.map(timeslot => timeslot.timeslot_id))

        // Create temp object for grid container
        let tmpGridContainer

        // Get all the locations and timeslots
        const locationsResponse = await getLocations()
        const timeslotsResponse = await getTimeslots()

        let locations = locationsResponse.data
        let timeslots = timeslotsResponse.data

        if (!locations || !timeslots) {
            if (this.options.edit) {
                tmpGridContainer = document.createElement('div')
                tmpGridContainer.classList.add('center-container')
                
                let warningTitle = document.createElement('h4')
                warningTitle.classList.add('warning-text')
                warningTitle.innerHTML = 'You have not added any Locations or Timeslots to the system'

                let button = document.createElement('a') as HTMLAnchorElement
                button.classList.add('btn', 'btn-primary')
                button.innerHTML = 'Edit Locations/Timeslots'
                button.href = '/private/management/locations_timeslots'

                tmpGridContainer.appendChild(warningTitle)
                tmpGridContainer.appendChild(button)
            }
            this.scheduleValid = false
        } else {
            this.scheduleValid = true
        }

        if (this.scheduleValid) {
            // Build objects that combine the locations and event locations to avoid extra unnessesary server calls
            const locationsInEvent:LocationsInEvent[] = this.eventLocations
            .map(eventLocation => {
                for (const location of locations) {
                    if (eventLocation.location_id === location.id) {
                        if (eventLocation.publicly_visible ||(!eventLocation.publicly_visible && this.options.showPrivate)) {
                            return {
                                ...location,
                                'event_location_id': eventLocation.id,
                                'event_location_order': eventLocation.order
                            }
                        }
                    }
                }
                return null
            })
            .filter(eventLocation => eventLocation !== null)

            this.locationsInEvent = locationsInEvent        
        
            const timeslotsInEvent:TimeslotsInEvent[] = this.eventTimeslots
                .map(eventTimeslot => {
                    for (const timeslot of timeslots) {
                        if (eventTimeslot.timeslot_id === timeslot.id) {
                            if (eventTimeslot.publicly_visible ||(!eventTimeslot.publicly_visible && this.options.showPrivate) || timeslot.is_break) {
                                return {
                                    ...timeslot,
                                    'event_timeslot_id': eventTimeslot.id
                                }
                            }
                        }
                    }
                    return null
                })
                .filter(eventTimeslot => eventTimeslot !== null)

            this.timeslotsInEvent = timeslotsInEvent

            // Update the grid size variables
            this.updateGridSize()
            
            // Work out what locations/timeslots need to be in the add dropdown (if any)
            const locationsForAddDropdown = locations
                .filter(location => !eventLocationIds.has(location.id) )
            
            const timeslotsForAddDropdown = timeslots
                .filter(timeslot => !eventTimeslotIds.has(timeslot.id))
            
            // Build the grid

            tmpGridContainer = await this.buildScheduleGrid(
                locationsInEvent,
                timeslotsInEvent,
                locationsForAddDropdown,
                timeslotsForAddDropdown,
            )

            if (locationsInEvent.length === 0 && timeslotsInEvent.length === 0) {
                if (!this.options.edit) {
                    tmpGridContainer = document.createElement('div')
                    tmpGridContainer.classList.add('center-container')
                    
                    let warningTitle = document.createElement('h4')
                    warningTitle.classList.add('warning-text')
                    warningTitle.innerHTML = 'This event has no schedule!'

                    let searchIconData = await getIconData('search-warning')
                    let iconContainer = document.createElement('div')
                    iconContainer.innerHTML = searchIconData

                    let icon = iconContainer.querySelector('svg')
                    icon.classList.remove('icon-tabler-zoom-exclamation')
                    icon.classList.add('icon-search-grid')

                    tmpGridContainer.appendChild(iconContainer)
                    tmpGridContainer.appendChild(warningTitle)
                }
                this.scheduleValid = false
            } else {
                this.scheduleValid = true
            }
        }

        // Set the new grid
        if (this.scheduleContainer) {
            emptyElement(this.scheduleContainer)
            this.scheduleContainer.appendChild(tmpGridContainer)

            if (!this.scheduleValid && !this.options.edit) {
                animateElement(tmpGridContainer, 'warning-error-shake')
            }
        }
    }

    // This builds the base schedule grid without any workshops
    async buildScheduleGrid(locations:LocationsInEvent[], timeslots:TimeslotsInEvent[], dropdownLocations:Location[]=[], dropdownTimeslots:Timeslot[]=[]) {
        // Set the session count back to 0
        this.sessionCount = 0

        if (window.innerWidth < 500) {
            this.scheduleContainer.style.marginLeft = `${locations.length*75}px`
        }

        // Create a grid container which will be the basis of the grid
        const gridContainer = document.createElement('div')
        gridContainer.id = 'grid-container'
        gridContainer.classList.add('grid-container')

        // Work out the base column and row counts for grid sizing
        const columnCount = locations.length
        const rowCount = timeslots.length

        // Calculate the top header height based on if the grid is editable or not
        const headerHeight = this.options.edit ? 100 : 50

        // Set the number of columns in the grid. There is only one row
        if (columnCount > 0) {
            gridContainer.style.gridTemplateColumns = `100px repeat(${columnCount}, ${this.options.width}px) 100px`
        } else {
            gridContainer.style.gridTemplateColumns = '100px 100px'
        }
        
        // Craete the timeslots column including an empty square for the top left corner
        const timeslotsColumn = document.createElement('div')
        timeslotsColumn.style.gridTemplateColumns = `100px`
        timeslotsColumn.style.gridTemplateRows = `100px repeat(${rowCount}, ${this.options.height}px) 100px`

        let emptyCornerCell = document.createElement('div')
        emptyCornerCell.classList.add('header')
        emptyCornerCell.style.width = '100px'
        emptyCornerCell.style.height = `${headerHeight}px`
        timeslotsColumn.appendChild(emptyCornerCell)

        // Iterate over all of the timeslots in the event
        for (const timeslot of timeslots) {
            // Build the timeslot element
            let div = document.createElement('div');
            div.classList.add('header', 'header-side');
            div.style.height = `${this.options.height}px`

            const timeslotContainer = document.createElement('div')
            timeslotContainer.classList.add('header-container')

            let timeslotName = document.createElement('p')
            timeslotName.classList.add('header-row')
            timeslotName.innerText = timeslot.name
            timeslotContainer.appendChild(timeslotName)

            let timeslotRange = document.createElement('p')
            timeslotRange.classList.add('header-row', 'header-text-secondary')
            timeslotRange.innerText = timeslot.range
            timeslotContainer.appendChild(timeslotRange)

            if (this.options.edit && timeslot.capacity_suggestion) {
                let capacityVisualiserContainer = document.createElement('div')
                capacityVisualiserContainer.classList.add('align-items-center')
                capacityVisualiserContainer.title = 'Timeslot capacity (+ overflow slots) / 75% of attendees'

                let firstRow = document.createElement('span')
                firstRow.classList.add('d-flex')
                firstRow.style.gap = '2px'

                let capacity = document.createElement('p')
                capacity.id = `capacity-${timeslot.id}`
                capacity.classList.add('header-text-secondary')
                firstRow.appendChild(capacity)

                let divider = document.createElement('p')
                divider.classList.add('header-text-secondary')
                divider.innerHTML = '/'
                firstRow.appendChild(divider)

                let totalCap = document.createElement('p')
                totalCap.id = `total-cap-${timeslot.id}`
                totalCap.classList.add('header-text-secondary')
                firstRow.appendChild(totalCap)
                capacityVisualiserContainer.appendChild(firstRow)

                let secondRow = document.createElement('span')
                secondRow.classList.add('d-flex')
                secondRow.style.gap = '5px'

                let overflowContainer = document.createElement('span')
                overflowContainer.classList.add('d-flex',)
                overflowContainer.style.gap = '2px'

                let overflow = document.createElement('p')
                overflow.id = `overflow-${timeslot.id}`
                overflow.classList.add('header-text-secondary')
                overflowContainer.innerHTML = `(${overflow.outerHTML})`
                secondRow.appendChild(overflowContainer)

                capacityVisualiserContainer.appendChild(secondRow)
                
                timeslotContainer.appendChild(capacityVisualiserContainer)
            }

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
            mainColumn.style.gridTemplateColumns = `${this.options.width}px`
            mainColumn.style.gridTemplateRows = `${headerHeight}px repeat(${rowCount}, ${this.options.height}px)`

            // Create the header and add the drag over events
            let header = document.createElement('div');
            header.setAttribute('event-location-id', String(location.event_location_id))
            header.setAttribute('data-index', String(location.event_location_order))
            header.classList.add('header', 'header-top');
            header.style.height = `${headerHeight}px`
            header.style.width = `${this.options.width}px`
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
                let width = this.options.width / 5
                grabHandle.style.width = `${width}px`
                grabHandle.style.marginLeft = `${(this.options.width - width) / 2}px`
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
                sessionBlock.style.width = `${this.options.width}px`
                sessionBlock.style.height = `${this.options.height}px`
                sessionBlock.setAttribute('has-workshop', String(false))
                sessionBlock.setAttribute('location-column-order', String(location.event_location_order))
                if (timeslot.is_break) {
                    sessionBlock.setAttribute('is-break', String(true))
                }
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
                addLocationsColumn.style.gridTemplateRows = `${this.options.height}px`

                const locationsDropdownCell = document.createElement('div');
                locationsDropdownCell.classList.add('header-end', 'header-top-end', 'header-top', 'dropdown')
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

    // Builds a key to show what the colours mean on a schedule (Only really used on public schedule)
    async buildKey() {
        const keyContainer = document.getElementById('key-container') as HTMLDivElement
        if (!keyContainer) {
            return
        }

        const workshopIds = Object.values(this.sessionsMap).map((session:Session) => {
            return session.workshop_id
        })

        const data:Partial<QueryStringData> = {
            id: workshopIds,
            $all_rows: true
        }

        const queryString = buildQueryString(data)
        const workshopsResponse = await getWorkshops(queryString)
        const workshops = workshopsResponse.data

        let keyDifficultyLevels:DifficultyLevel[] = []
        let keyWorkshopTypes:WorkshopType[] = []
        
        for (const workshop of workshops) {
            const difficultyLevel = this.difficultyLevels.find((dl) => dl.id === workshop.difficulty_id)
            const workshopType = this.workshopTypes.find((wt) => wt.id === workshop.workshop_type_id)

            if (difficultyLevel && !keyDifficultyLevels.includes(difficultyLevel)) {
                keyDifficultyLevels.push(difficultyLevel)
            }

            if (workshopType && !keyWorkshopTypes.includes(workshopType)) {
                if (((!workshopType.publicly_visible && this.options.showPrivate) || (workshopType.publicly_visible)) && (!isNullEmptyOrSpaces(workshopType.display_colour))) {
                    keyWorkshopTypes.push(workshopType)
                }
            }
        }
        
        keyContainer.style.gridTemplateColumns = `100px repeat(${keyDifficultyLevels.length + keyWorkshopTypes.length}, ${this.options.width}px)`

        emptyElement(keyContainer)

        let header = document.createElement('div')
        header.classList.add('header', 'header-top')
        
        let headerContainer = document.createElement('div')
        headerContainer.classList.add('header-container')

        let keyName = document.createElement('div')
        keyName.classList.add('header-row')
        keyName.innerHTML = 'Key'

        headerContainer.appendChild(keyName)
        header.appendChild(headerContainer)

        keyContainer.appendChild(header)

        for (const kdl of keyDifficultyLevels) {
            let header = document.createElement('div')
            header.classList.add('header', 'header-top')
            
            let headerContainer = document.createElement('div')
            headerContainer.classList.add('header-container')
            headerContainer.style.backgroundColor = hexToRgba(kdl.display_colour, 0.5)

            let keyName = document.createElement('p')
            keyName.classList.add('header-row')
            keyName.innerHTML = kdl.name

            headerContainer.appendChild(keyName)
            header.appendChild(headerContainer)

            keyContainer.appendChild(header)
        }

        for (const kwt of keyWorkshopTypes) {
            let header = document.createElement('div')
            header.classList.add('header', 'header-top')
            
            let headerContainer = document.createElement('div')
            headerContainer.classList.add('header-container')
            headerContainer.style.backgroundColor = hexToRgba(kwt.display_colour, 0.5)

            let keyName = document.createElement('p')
            keyName.classList.add('header-row')
            keyName.innerHTML = kwt.name

            headerContainer.appendChild(keyName)
            header.appendChild(headerContainer)

            keyContainer.appendChild(header)
        }


    }

    // Populate the session blocks with workshops that are assigned to them
    async populateSessions() {
        // If the grid session count is not equal to the length of the sessions justed pulled down, reload the grid
        if (this.sessionCount != this.eventSessions.length) {
            await this.updateSchedule()
            return
        }

        let sessionWorkshopsToAdd:Session[] = []
        let sessionWorkshopsToRemove = []
        let sessionSignupCountsToUpdate:Session[] = []

        // Iterate over the sessions
        for (const session of Object.values(this.sessionsMap)) {
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
                if (!sessionWorkshopsToAdd.includes(session)) {
                    sessionWorkshopsToAdd.push(session)
                }

                if (!sessionSignupCountsToUpdate.includes(session)) {
                    sessionSignupCountsToUpdate.push(session)
                }
            }
            else if (sessionBlockHasWorkshop && !session.has_workshop) {
                // If the session block says it has a workshop, but the DB says it shouldn't, set that session to have its workshop removed
                sessionWorkshopsToRemove.push(session)
            }

            // If the session block says it has a specific workshop in it, but the DB says it should have a different one, set that session to be updated
            if (sessionBlockHasWorkshop) {
                let sessionWorkshopId = sessionBlock.getAttribute('workshop-id')
                if (sessionWorkshopId !== String(session.workshop_id)) {
                    if (!sessionWorkshopsToAdd.includes(session)) {
                        sessionWorkshopsToAdd.push(session)
                    }

                    if (!sessionSignupCountsToUpdate.includes(session)) {
                        sessionSignupCountsToUpdate.push(session)
                    }
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

            // If volunteeres can signup on this grid, check for differences
            if (this.options.showVolunteerSignup) {
                const areEqual = 
                    this.volunteerSignupsMapOLD[session.id] === undefined && this.volunteerSignupsMap[session.id] === undefined
                    ? true
                    : this.volunteerSignupsMapOLD[session.id]?.size === this.volunteerSignupsMap[session.id]?.size &&
                    Array.from(this.volunteerSignupsMapOLD[session.id]).every((value, index) => value === Array.from(this.volunteerSignupsMap[session.id])[index])

                if (!areEqual) {
                    if (!sessionWorkshopsToAdd.includes(session)) {
                        sessionWorkshopsToAdd.push(session)
                    }
                }
            }


            // If attendee signup counts are shown, check for a difference
            if (this.options.showAttendeeSignupCounts) {
                const areEqual = 
                    ((
                        this.attendeeSignupCountsMapOLD[session.id] === undefined && this.attendeeSignupCountsMap[session.id] === undefined
                        ? true
                        : this.attendeeSignupCountsMapOLD[session.id] === this.attendeeSignupCountsMap[session.id]) &&
                    (
                        this.SessionsMapOLD[session.id] === undefined || this.sessionsMap[session.id] === undefined
                        ? true
                        : this.SessionsMapOLD[session.id].capacity === this.sessionsMap[session.id].capacity
                    ))

                if (!areEqual) {
                    if (!sessionSignupCountsToUpdate.includes(session)) {
                        sessionSignupCountsToUpdate.push(session)
                    }
                }
            }
        }

        // Generate the objects for the workshops to add to avoid doing extra unnessessary server calls
        let workshopsToAddIds = sessionWorkshopsToAdd.map(sw => sw.workshop_id)
        let workshopsToUpdate = sessionSignupCountsToUpdate.map(sw => sw.workshop_id)
        let idsToAdd = [...new Set([...workshopsToAddIds, ...workshopsToUpdate])]
        let queryData:Partial<QueryStringData> = {}

        if (idsToAdd.length > 0) {
            queryData.id = idsToAdd
        }
        let workshopsQueryString = buildQueryString(queryData, false)

        if (sessionWorkshopsToAdd.length > 0 || sessionSignupCountsToUpdate.length > 0) {
            const workshopsResponse = await getWorkshops(workshopsQueryString)
            let workshops = workshopsResponse.data
            if (!this.options.workshopCardOptions.difficultyLevels) {
                
                this.options.workshopCardOptions.difficultyLevels = this.difficultyLevels
            }

            if (!this.options.workshopCardOptions.workshopTypes) {
                this.options.workshopCardOptions.workshopTypes = this.workshopTypes
            }

            const workshopsToAdd = sessionWorkshopsToAdd
                .map(sw => {
                    for (const workshop of workshops) {
                        if (sw.workshop_id === workshop.id) {
                            if (workshop.publicly_visible ||(!workshop.publicly_visible && this.options.showPrivate)) {
                                return {
                                    ...workshop,
                                    'event_location_id': sw.event_location_id,
                                    'event_timeslot_id': sw.event_timeslot_id,
                                    'session_id': sw.id
                                }
                            }
                        }
                    }
                    return null
                })
                .filter(sw => sw != null)

            const workshopsToUpdate = sessionSignupCountsToUpdate
                .map(sw => {
                    for (const workshop of workshops) {
                        if (sw.workshop_id === workshop.id) {
                            if (workshop.publicly_visible ||(!workshop.publicly_visible && this.options.showPrivate)) {
                                return {
                                    ...workshop,
                                    'event_location_id': sw.event_location_id,
                                    'event_timeslot_id': sw.event_timeslot_id,
                                    'session_id': sw.id
                                }
                            }
                        }
                    }
                    return null
                })
                .filter(sw => sw != null)


            // Iterate over each workshop to be added and trigger an animation to set the workshop
            for (const workshop of workshopsToAdd) {
                // Add the workshop to the workshops map
                if (!this.workshopsMap[workshop.id]) {
                    this.workshopsMap[workshop.id] = workshop
                }

                let sessionBlock = document.getElementById(`session-${workshop.event_location_id}-${workshop.event_timeslot_id}`)
                if (!sessionBlock) {
                    continue
                }

                let cardOptions = { ...this.options.workshopCardOptions, sessionId: workshop.session_id}
                if (this.options.showVolunteerSignup) {
                    let workshopSignups = 0
                    let selectedUserSignupUp = false
                    if (this.volunteerSignupsMap[workshop.session_id] !== null && this.volunteerSignupsMap[workshop.session_id] !== undefined) {
                        workshopSignups = this.volunteerSignupsMap[workshop.session_id].size
                        selectedUserSignupUp = this.volunteerSignupsMap[workshop.session_id].has(this.options.userId)
                    }

                    if (workshop.min_volunteers !== null && workshop.min_volunteers !== undefined) {
                        let cardBody = document.createElement('div')
                        cardBody.style.marginTop = '-15px'
                        let volunteerCountText = document.createElement('p')
                        volunteerCountText.innerHTML = `${workshopSignups}/${workshop.min_volunteers}`

                        cardBody.appendChild(volunteerCountText)

                        if (workshopSignups > 0) {
                            let avatarContainer = document.createElement('span')
                            const numberOfAvatarsFit = Math.floor(this.options.width / 30)

                            let index = 0
                            for (const userId of this.volunteerSignupsMap[workshop.session_id]) {
                                const user = this.usersInfoMap[userId]
                                if (!user) {
                                    continue
                                }

                                if (index >= numberOfAvatarsFit-2) {
                                    break
                                }

                                let volunteerAvatar = buildUserAvatar(this.usersInfoMap[userId], 25)

                                if (index+1 < workshopSignups) {
                                    volunteerAvatar.style.marginRight = '5px'
                                }

                                volunteerAvatar.style.marginBottom = '5px'
                                volunteerAvatar.style.marginTop = '-30px'
                                avatarContainer.appendChild(volunteerAvatar)

                                index++
                            }


                            if (index < workshopSignups) {
                                let volunteerAvatar = buildUserAvatar(null, 25, `+${workshopSignups - index}`)
                                volunteerAvatar.style.marginBottom = '5px'
                                avatarContainer.appendChild(volunteerAvatar)
                            }

                            // Tooltip
                            const tooltipElement = document.createElement('div')
                            tooltipElement.classList.add('card')
                            for (const userId of this.volunteerSignupsMap[workshop.session_id]) {
                                const user = this.usersInfoMap[userId]
                                if (!user) {
                                    continue
                                }

                                tooltipElement.appendChild(buildUserTooltip(user))
                            }

                            avatarContainer.onmouseover = ((event) => {
                                event.stopPropagation()
                                addTooltipToElement(tooltipElement, avatarContainer)
                            })

                            cardBody.appendChild(avatarContainer)
                        }

                        cardOptions.cardBodyElement = cardBody
                        if (workshopSignups < workshop.min_volunteers) {
                            cardOptions.backgroundColour = '#ff5838b3'
                        } else {
                            cardOptions.backgroundColour = '#b3ff4fb3'
                        }

                        if (this.options.volunteerSignup) {
                            if (selectedUserSignupUp) {
                                cardOptions.backgroundColour = '#38aaffb3'
                                cardOptions.cardBodyActionIcon = this.icons.userRemove
                                cardOptions.cardBodyActionFunc = () => {
                                    hideAllTooltips()
                                    removeVolunteerSignup(this.options.eventId, this.options.userId, workshop.session_id).then((response) => {
                                        successToast(response.message)
                                        const set = this.volunteerSignupsMap[workshop.session_id];
                                        if (set) {
                                            set.delete(this.options.userId)
                                            if (set.size === 0) {
                                                delete this.volunteerSignupsMap[workshop.session_id]
                                            }
                                        }
                                        this.populateSessions()
                                    }).catch((error) => {
                                        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
                                        errorToast(errorMessage)
                                    })
                                }
                            } else {
                                cardOptions.cardBodyActionIcon = this.icons.userAdd
                                cardOptions.cardBodyActionFunc = () => {
                                    hideAllTooltips()
                                    const data:Partial<VolunteerSignup> = {
                                        session_id: workshop.session_id
                                    }

                                    addVolunteerSignup(this.options.eventId, this.options.userId, data).then((response) => {
                                        successToast(response.message)
                                        const signup = response.data
                                        if (!this.volunteerSignupsMap[signup.session_id]) {
                                            this.volunteerSignupsMap[signup.session_id] = new Set()
                                        }
                                        this.volunteerSignupsMap[signup.session_id].add(signup.user_id)

                                        this.populateSessions()
                                    }).catch((error) => {
                                        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
                                        errorToast(errorMessage)
                                    })
                                }
                            }
                        }
                    } else {
                        cardOptions.cardBodyText = ' '
                        cardOptions.backgroundColour = '#7e827f'
                    }
                }

                let workshopCard = new WorkshopCard(workshop, cardOptions)
                let workshopCardElement = await workshopCard.element() as HTMLElement

                this.animateWorkshopDrop(sessionBlock, workshopCardElement)
                sessionBlock.setAttribute('has-workshop', String(true))
                sessionBlock.setAttribute('workshop-id', String(workshop.id))
            }
            if (this.options.showAttendeeSignupCounts) {
                for (const workshop of workshopsToUpdate) {

                    const sessionId = workshop.session_id
                    const signupCountElement = document.getElementById(`session-attendance-${sessionId}`)

                    if (signupCountElement) {
                        if (workshop.attendee_registration) {
                            let signupCount = this.attendeeSignupCountsMap[sessionId]
                            if (signupCount === null || signupCount === undefined) {
                                signupCount = 0
                            }

                            signupCountElement.innerHTML = `(${signupCount}/${this.sessionsMap[sessionId].capacity})`
                        } else {
                            signupCountElement.innerHTML = ''
                        }
                    }
                }
            }
        }

        if (sessionWorkshopsToAdd.length > 0) {
            if (this.options.buildKey) {
                this.buildKey()
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

                // Remove old workshops from the workshops map
                if (this.workshopsMap[workshop.workshop_id]) {
                    delete this.workshopsMap[workshop.workshop_id]
                }
            }
        }

        // Add each session's capacity to the capacity map
        if (this.options.edit) {
            this.timeslotCapacityMap = {}
            for (const session of this.eventSessions) {    
                if (!session.has_workshop) {
                    continue
                }

                const workshop = this.workshopsMap[session.workshop_id]
                if (!workshop) {
                    continue
                }

                const realTimeslotId = this.getTimeslotIdfromEventTimeslotId(session.event_timeslot_id)
                if (!this.timeslotCapacityMap[realTimeslotId]) {
                    let timeslotCapacity:ScheduleGridTimeslotCapacity = {
                        capacity: 0,
                        overflow: 0
                    }
                    this.timeslotCapacityMap[realTimeslotId] = timeslotCapacity
                }

                if (realTimeslotId === 6) {
                }

                if (workshop.overflow) {
                    this.timeslotCapacityMap[realTimeslotId].overflow += session.capacity
                } else {
                    this.timeslotCapacityMap[realTimeslotId].capacity += session.capacity
                }
            }

            // Update capacity visualiser
            for (const [timeslotId, timeslotCapacity] of Object.entries(this.timeslotCapacityMap)) {
                const capacityText = document.getElementById(`capacity-${timeslotId}`)
                const overflowText = document.getElementById(`overflow-${timeslotId}`)
                const totalCapacityText = document.getElementById(`total-cap-${timeslotId}`)

                if (!capacityText || !overflowText || !totalCapacityText) {
                    continue
                }

                capacityText.innerHTML = String(timeslotCapacity.capacity)
                overflowText.innerHTML = `+${timeslotCapacity.overflow}`
                const totalCapacity = Math.ceil(this.eventMetadata.attendee_count * 0.75)
                totalCapacityText.innerHTML = String(totalCapacity)

                // Style the text
                const combinedCapacity = timeslotCapacity.capacity + timeslotCapacity.overflow
                if (combinedCapacity >= totalCapacity) {
                    capacityText.classList.remove('text-yellow', 'text-danger')
                    capacityText.classList.add('text-success')

                    overflowText.classList.remove('text-yellow', 'text-danger')
                    overflowText.classList.add('text-success')
                } else if (combinedCapacity <= (totalCapacity) && combinedCapacity > (totalCapacity * 0.5)) {
                    capacityText.classList.remove('text-success', 'text-danger')
                    capacityText.classList.add('text-yellow')

                    overflowText.classList.remove('text-success', 'text-danger')
                    overflowText.classList.add('text-yellow')
                } else if (combinedCapacity <= (totalCapacity * 0.5)) {
                    capacityText.classList.remove('text-yellow', 'text-success')
                    capacityText.classList.add('text-danger')

                    overflowText.classList.remove('text-yellow', 'text-success')
                    overflowText.classList.add('text-danger')
                }
            }
        }

        // Store the old maps for comparision on next itteration
        this.SessionsMapOLD = cloneMap(this.sessionsMap, (session) => ({ ...session }))
        this.volunteerSignupsMapOLD = cloneMap(this.volunteerSignupsMap, (set) => new Set(set))
        this.attendeeSignupCountsMapOLD = cloneMap(this.attendeeSignupCountsMap)
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

                                const isBreak = sessionBlock.getAttribute('is-break')
                                if (isBreak) {
                                    continue
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
            const isBreak = Boolean((event.target as HTMLElement).getAttribute('is-break')) || false
            if (!sessionID || !workshopID) {
                return
            }

            if (!isBreak) {
                if (await addWorkshopToSession(sessionID, workshopID)) {
                    this.sessionsMap[sessionID].has_workshop = true
                    this.sessionsMap[sessionID].workshop_id = workshopID
                    await scheduleGrid.populateSessions()
                }
            } else {
                let workshop = await getWorkshopField(workshopID, 'name')
                let confirmDeleteModal = $('#confirm-place-on-break')
                confirmDeleteModal.modal('show')

                confirmDeleteModal.find('#confirm-place-text').html(`
                    This session apears to be a break. You should only place volunteer workshops on breaks.<br><br>
                    Are you sure you want to place "${workshop.name}" on this session? 
                `);

                confirmDeleteModal.find('#confirm-place-button').off('click');

                confirmDeleteModal.find('#confirm-place-button').click(async () => {
                    if (await addWorkshopToSession(sessionID, workshopID)) {
                        this.sessionsMap[sessionID].has_workshop = true
                        this.sessionsMap[sessionID].workshop_id = workshopID
                        await scheduleGrid.populateSessions()
                    }
                });

                return true
            }
        }
        this.currentDragType = ''
    }

    // Handle workshop delete event
    async workshopRemoveFunc(sessionId:number, scheduleGrid:ScheduleGrid) {
        if (await removeWorkshopFromSession(sessionId)) {
            scheduleGrid.sessionsMap[sessionId].has_workshop = false
            scheduleGrid.sessionsMap[sessionId].workshop_id = null
            await scheduleGrid.populateSessions()
        }
    }

      // Handle workshop settings event
      async sessionSettingsFunc(sessionId:number, scheduleGrid:ScheduleGrid) {
        let session = scheduleGrid.sessionsMap[sessionId]
        let setitngsModal = $('#session-settings-modal')
        setitngsModal.modal('show')
        setitngsModal.find('#session-settings-capacity').val(session.capacity);

        setitngsModal.find('#recalculate-session-capacity').off('click');

        setitngsModal.find('#recalculate-session-capacity').click(() => {
            recalculateSessionCapacity(sessionId).then((response) => {
                successToast('Session capacity successfully updated')
                setitngsModal.find('#session-settings-capacity').val(response.data);
            }).catch(() => {
                errorToast('A Error occured when recalculating session capacity')
            })
        });


        setitngsModal.find('#save-session-settings').off('click');

        setitngsModal.find('#save-session-settings').click(() => {
            const data:sessionSettings = {
                capacity: Number((document.getElementById('session-settings-capacity') as HTMLInputElement).value)
            }
            updateSessionSettings(sessionId, data).then(() => {
                successToast('Session settings successfully updated')
                setitngsModal.modal('hide')
            }).catch(() => {
                errorToast('A Error occured when updating session settings')
            })
        });

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
            let oldWidth = scheduleGrid.options.width
            let oldHeight = scheduleGrid.options.height
            let windowWidth = window.innerWidth
            let windowHeight = window.innerHeight
            
            // Round the width to the nearest 50px. Then take 50 px away for side padding
            let roundedWindowWidth = (50 * Math.round(windowWidth / 50)) * 0.95
            let roundedWindowHeight = (50 * Math.round(windowHeight / 50)) * 0.72

            if (scheduleGrid.options.edit) {
                roundedWindowWidth -= 100
                roundedWindowHeight -= 100
            }

            let blockWidth = Math.round(roundedWindowWidth / scheduleGrid.locationsInEvent.length)
            let blockHeight = Math.round(roundedWindowHeight / scheduleGrid.timeslotsInEvent.length)

            scheduleGrid.options.width = blockWidth
            scheduleGrid.options.height = blockHeight
            scheduleGrid.options.workshopCardOptions.width = scheduleGrid.options.width
            scheduleGrid.options.workshopCardOptions.height = scheduleGrid.options.height

            if (oldWidth !== blockWidth || oldHeight !== blockHeight) {
                if (this.gridInitialised) {
                    this.populateSessions()
                }
            }
        }
    }

    getTimeslotIdfromEventTimeslotId(eventTimeslotId:number):number {
        return this.eventTimeslots.find(ts => ts.id === eventTimeslotId).timeslot_id
    }
}


document.addEventListener("scroll", debounce(function () {
    let workshopSelectionContainer = document.querySelector('.workshop-selection-container')
    let gridLocationHeaders = document.querySelectorAll('.header-top')
    
    if (workshopSelectionContainer === null || workshopSelectionContainer === undefined) {
        gridLocationHeaders.forEach(element => {
            let header = element as HTMLElement
            header.style.position = 'sticky';
            header.style.top = '10px'
        })
        return
    }

    gridLocationHeaders.forEach(element => {
        let header = element as HTMLElement

        header.style.position = 'sticky'
        header.style.top = `${workshopSelectionContainer.clientHeight + 25}px`
        
    })

}, 10));