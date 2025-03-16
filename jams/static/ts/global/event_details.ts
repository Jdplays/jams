import { getEventField, getEventsField, getNextEvent } from "./endpoints"
import { ApiResponse, Event } from "./endpoints_interfaces"
import { buildQueryString, createEventSelectionDropdown, emptyElement, eventDropdownItemText, formatDateToShort, preLoadEventDetails } from "./helper"
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
    private eventDetailsMap:Record<number, Partial<Event>> = {}

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
    }

    async init() {
        const queryData:Partial<QueryStringData> = {
            inclusive: this.options.dateInclusive
        }
        const queryString = buildQueryString(queryData)
        
        if (this.options.eventId === null || this.options.eventId === undefined) {
           await getNextEvent(queryString).then((response:ApiResponse<number>) => {
            this.eventId = response.data
           }).catch(() => {
            this.eventId = -1
           })
        }

        let infoTextDiv = document.createElement('div')
        infoTextDiv.id = 'info-text'
        this.detailsContainer.insertBefore(infoTextDiv, this.detailsContainer.firstChild)

        if (this.options.showEventSelection) {
            this.eventDetailsMap = await preLoadEventDetails()
            if (this.eventDetailsMap) {
                await this.populateEventSelectionDropdown()
            }
        }

        await this.populateEventDetails()
    }

    async populateEventDetails() {
        const infoTextDiv = this.detailsContainer.querySelector('#info-text') as HTMLDivElement
        emptyElement(infoTextDiv)

        const eventInfoText = document.createElement('p')
    
        if (this.eventId && this.eventId !== -1) {
            let eventName = await getEventField(this.eventId, 'filtered_name')
            let eventDate = await getEventField(this.eventId, 'date')
            const date = (eventDate.date)
            eventInfoText.innerHTML = `<strong>${eventName.filtered_name}</strong> - ${formatDateToShort(date, {includeTime:false})}`

            for (const element of this.options.eventDependentElements) {
                if (element) {
                    element.style.display = 'block'
                }
            }

            infoTextDiv.appendChild(eventInfoText)

            return
        }
    
        let infoText = 'No Upcomming '
        if (!this.eventDetailsMap) {
            infoText += 'or past events. '
        } else {
            infoText += 'events. '
        }

        if (this.options.showEventSelection && this.eventDetailsMap) {
            infoText += 'Please select one from the dropdown'
        } else if (!this.eventDetailsMap) {
            infoText += 'Please try again later...'
        }

        eventInfoText.innerHTML = infoText
        
        for (const element of this.options.eventDependentElements) {
            element.style.display = 'none'
        }

        infoTextDiv.appendChild(eventInfoText)
    }

    async eventSelectionDropdownOnClick(edo:EventDetails, eId:number) {
        edo.eventId = Number(eId)
        await edo.populateEventDetails()
        document.getElementById('select-event-dropdown-button').innerText = eventDropdownItemText(edo.eventDetailsMap[edo.eventId])

        if (edo.options.eventOnChangeFunc) {
            edo.options.eventOnChangeFunc()
        }
    }

    // Populates the Event selection dropdown with all of the events
    async populateEventSelectionDropdown() {
        let eventSelectionDropdown = document.querySelector('#select-event-dropdown-container') as HTMLElement
        if (eventSelectionDropdown) {
            emptyElement(eventSelectionDropdown)
        }

        eventSelectionDropdown = createEventSelectionDropdown(this.eventId, this.eventDetailsMap, (eId) => {
            this.eventSelectionDropdownOnClick(this, eId)
        })
        
        eventSelectionDropdown.classList.add('mb-3')

        const dropdownsContainer = this.detailsContainer.querySelector('.grid-columns-flex')
        if (dropdownsContainer) {
            dropdownsContainer.insertBefore(eventSelectionDropdown, dropdownsContainer.firstChild)
            return
        }

        this.detailsContainer.appendChild(eventSelectionDropdown)
    }

    eventDropdownItemText(event:Partial<Event>) {
        const date = (event.date)
        return `${event.name} - ${formatDateToShort(date, {includeTime:false})}`
    }

    eventName() {
        return this.eventDetailsMap[this.eventId].name
    }
}