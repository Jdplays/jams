import { getEvent, getEventField, getEventsField, getnextEvent } from "./endpoints"
import { BackendResponse, Event } from "./endpoints_interfaces"
import { buildQueryString, createDropdown, emptyElement, formatDate } from "./helper"
import { QueryStringData } from "./interfaces"

export interface EventDetailsOptions {
    eventId?:number|null
    showEventSelection?:boolean
    dateInclusive?:boolean
    eventDependentElements?:HTMLElement[]
    eventOnChangeFunc?:(() => void)
}


export class EventDetails {
    private detailsContainer:HTMLDivElement
    private options:EventDetailsOptions
    private eventNamesMap:Record<number, Partial<Event>> = {}

    public eventId:number

    constructor(detailsContainerId:string, options:EventDetailsOptions = {}) {
        this.detailsContainer = document.getElementById(detailsContainerId) as HTMLDivElement

        let {
            eventId = null,
            showEventSelection = true,
            dateInclusive = true,
            eventDependentElements = [],
            eventOnChangeFunc = null
        } = options

        this.options = {
            eventId,
            showEventSelection,
            dateInclusive,
            eventDependentElements,
            eventOnChangeFunc
        }

        this.eventSelectionDropdownOnChange = this.eventSelectionDropdownOnChange.bind(this)
    }

    async init() {
        const queryData:Partial<QueryStringData> = {
            inclusive: this.options.dateInclusive
        }
        const queryString = buildQueryString(queryData)
        
        if (this.options.eventId === null || this.options.eventId === undefined) {
           await getnextEvent(queryString).then((response:BackendResponse<number>) => {
            this.eventId = response.data
           }).catch(() => {
            this.eventId = 1
           })
        }

        let infoTextDiv = document.createElement('div')
        infoTextDiv.id = 'info-text'
        this.detailsContainer.insertBefore(infoTextDiv, this.detailsContainer.firstChild)

        this.eventNamesMap = await this.preLoadEventNames()
        await this.populateEventDetails()

        await this.populateEventSelectionDropdown()
    }

    async preLoadEventNames() {
        const response = await getEventsField('name')
        let eventNames = response.data
        let eventNamesMap:Record<number, Partial<Event>> = {}
        eventNames.forEach((event: Partial<Event>) => {
            eventNamesMap[event.id] = event
        })
        return eventNamesMap
    }

    async populateEventDetails() {
        const infoTextDiv = this.detailsContainer.querySelector('#info-text') as HTMLDivElement
        emptyElement(infoTextDiv)

        const eventInfoText = document.createElement('p')
    
        if (this.eventId !== null && this.eventId !== -1) {
            let eventName = await getEventField(this.eventId, 'name')
            let eventDate = await getEventField(this.eventId, 'date')
            eventInfoText.innerHTML = `<strong>${eventName.name}</strong> - ${formatDate(eventDate.date)}`

            for (const element of this.options.eventDependentElements) {
                element.style.display = 'block'
            }

            infoTextDiv.appendChild(eventInfoText)

            return
        }
    
        this.eventId = null
        eventInfoText.innerHTML = 'No Upcomming Events. Please select one from the dropdown'
        
        for (const element of this.options.eventDependentElements) {
            element.style.display = 'none'
        }

        infoTextDiv.appendChild(eventInfoText)
    }

    // Populates the Event selection dropdown with all of the events
    async populateEventSelectionDropdown() {
        let eventSelectionDropdown = document.createElement('div')
        eventSelectionDropdown.classList.add('mb-3')

        let selectionHeader = document.createElement('div')
        selectionHeader.classList.add('form-label')
        selectionHeader.style.marginRight = '10px'
        selectionHeader.innerHTML = 'Select Event:'

        eventSelectionDropdown.appendChild(selectionHeader)

        let defaultValue = 'Select an Event'
        if (this.eventNamesMap[this.eventId] !== undefined && this.eventNamesMap[this.eventId] !== null) {
            defaultValue = this.eventNamesMap[this.eventId].name
        }
        let select = createDropdown(Object.values(this.eventNamesMap), defaultValue, this.eventSelectionDropdownOnChange)
        select.id = 'event-select'
        select.classList.add('form-select')
        eventSelectionDropdown.appendChild(select)

        eventSelectionDropdown.appendChild(select)

        const dropdownsContainer = this.detailsContainer.querySelector('.grid-columns-flex')
        if (dropdownsContainer) {
            dropdownsContainer.insertBefore(eventSelectionDropdown, dropdownsContainer.firstChild)
            return
        }

        this.detailsContainer.appendChild(eventSelectionDropdown)
    }

    // Handles the onchange event for the Event selction dropdown 
    eventSelectionDropdownOnChange(event:any) {
        const element = event.target as HTMLInputElement
        const selectedValue = Number(element.value)
        this.eventId = selectedValue
        this.populateEventDetails()

        if (this.options.eventOnChangeFunc) {
            this.options.eventOnChangeFunc()
        }
    }
}