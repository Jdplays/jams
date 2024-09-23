import { getEventField, getEventsField, getnextEvent } from "./endpoints"
import { BackendResponse, Event } from "./endpoints_interfaces"
import { buildQueryString, emptyElement, formatDate, formatDateToShort } from "./helper"
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
           await getnextEvent(queryString).then((response:BackendResponse<number>) => {
            this.eventId = response.data
           }).catch(() => {
            this.eventId = 1
           })
        }

        let infoTextDiv = document.createElement('div')
        infoTextDiv.id = 'info-text'
        this.detailsContainer.insertBefore(infoTextDiv, this.detailsContainer.firstChild)

        this.eventDetailsMap = await this.preLoadEventNames()
        await this.populateEventDetails()

        await this.populateEventSelectionDropdown()
    }

    async preLoadEventNames() {
        const namesResponse = await getEventsField('name')
        const datesResponse = await getEventsField('date')
        let eventNames = namesResponse.data
        let eventDates = datesResponse.data
        let eventDetailsMap:Record<number, Partial<Event>> = eventNames.reduce((acc, en) => {
            const matchedEvent = eventDates.find((ed) => en.id === ed.id)
            if (matchedEvent && en.id !== undefined) {
                acc[en.id] = {...en, ...matchedEvent}
            } else if (en.id !== undefined) {
                acc[en.id] = {...en}
            }
            return acc
            },
            {} as Record<number, Partial<Event>>
        )

        return eventDetailsMap
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
        let eventSelectionDropdown = document.querySelector('#select-event-dropdown-container') as HTMLElement
        if (eventSelectionDropdown) {
            emptyElement(eventSelectionDropdown)
        }

        eventSelectionDropdown = document.createElement('div')
        eventSelectionDropdown.classList.add('mb-3')
        eventSelectionDropdown.id = 'select-event-dropdown-container'

        let selectionHeader = document.createElement('div')
        selectionHeader.classList.add('form-label')
        selectionHeader.style.marginRight = '10px'
        selectionHeader.innerHTML = 'Select Event:'

        eventSelectionDropdown.appendChild(selectionHeader)

        let dropdownButton = document.createElement('a')
        dropdownButton.id = 'select-event-dropdown-button'
        dropdownButton.classList.add('btn', 'dropdown-toggle')
        dropdownButton.setAttribute('data-bs-toggle', 'dropdown')
        dropdownButton.innerHTML = 'Select Event'
        if (this.eventId) {
            dropdownButton.innerHTML = this.eventDropdownItemText(this.eventDetailsMap[this.eventId])
        }

        eventSelectionDropdown.appendChild(dropdownButton)

        let dropdown = document.createElement('div')
        dropdown.id = 'select-event-dropdown'
        dropdown.classList.add('dropdown-menu')

        Object.entries(this.eventDetailsMap).forEach(([id, event]) => {
            let item = document.createElement('a')
            item.classList.add('dropdown-item')

            let text = document.createElement('span')
            text.innerHTML = this.eventDropdownItemText(event)

            item.appendChild(text)

            item.onclick =  () => {
                this.eventId = Number(id)
                this.populateEventDetails()
                dropdownButton.innerHTML = this.eventDropdownItemText(this.eventDetailsMap[this.eventId])

                if (this.options.eventOnChangeFunc) {
                    this.options.eventOnChangeFunc()
                }
            }

            dropdown.appendChild(item)
        })

        eventSelectionDropdown.appendChild(dropdown)

        const dropdownsContainer = this.detailsContainer.querySelector('.grid-columns-flex')
        if (dropdownsContainer) {
            dropdownsContainer.insertBefore(eventSelectionDropdown, dropdownsContainer.firstChild)
            return
        }

        this.detailsContainer.appendChild(eventSelectionDropdown)
    }

    eventDropdownItemText(event:Partial<Event>) {
        return `${event.name} - ${formatDateToShort(event.date)}`
    }
}