import { getDifficultyLevels, getIconData, getWorkshopTypes } from '@global/endpoints'
import { DifficultyLevel, Workshop, WorkshopType } from '@global/endpoints_interfaces'
import {hexToRgba} from '@global/helper'
import { ScheduleGrid } from '@global/schedule_grid'

export interface WorkshopCardOptions {
    sessionId?:number|null
    difficultyLevels?:DifficultyLevel[]|null
    workshopTypes?:WorkshopType[]|null
    width?:number
    height?:number
    remove?:boolean
    showAttendeeSignupCounts?:boolean
    cardRemoveIcon?:string|null
    cardRemoveFunc?:((arg1:number, arg2:any) => void)
    cardBodyText?:string|null
    cardBodyElement?:HTMLElement|null
    cardBodyActionText?:string|null
    cardBodyActionIcon?:string|null
    cardBodyActionFunc?:(() => void) | null
    backgroundColour?:string|null
    scheduleGrid?:ScheduleGrid|null

}

type ContainerStyles = {[key: string]: any}

export class WorkshopCard {
    private workshop:Workshop
    private options:WorkshopCardOptions
    private titleFontSize:number
    private bodyFontSize:number
    private workshopDifficulty:DifficultyLevel|undefined
    private workshopType:WorkshopType|undefined

    constructor(workshop:Workshop, options:WorkshopCardOptions) {
        this.workshop = workshop
        this.titleFontSize = 0
        this.bodyFontSize = 0

        // Set options (use defaults for options not provided)
        let {
            sessionId = null,
            difficultyLevels = null,
            workshopTypes = null,
            width = 150,
            height = 150,
            remove = false,
            showAttendeeSignupCounts = false,
            cardRemoveIcon = null,
            cardRemoveFunc,
            cardBodyText = null,
            cardBodyElement = null,
            cardBodyActionText = null,
            cardBodyActionIcon = null,
            cardBodyActionFunc = null,
            backgroundColour = null,
            scheduleGrid = null
        } = options

        this.options = {
            sessionId,
            difficultyLevels,
            workshopTypes,
            width,
            height,
            remove,
            showAttendeeSignupCounts,
            cardRemoveIcon,
            cardRemoveFunc,
            cardBodyText,
            cardBodyElement,
            cardBodyActionText,
            cardBodyActionIcon,
            cardBodyActionFunc,
            backgroundColour,
            scheduleGrid
        }

        this.init()
    }

    async init() {
        // If the workshop wasn't passed it, return null as we can't create a card without them
        if (!this.workshop) {
            return null
        }

        // Load the difficulty levels if they weren't passed in
        if (!this.options.difficultyLevels) {
            const response = await getDifficultyLevels()
            this.options.difficultyLevels = response.data
        }

        // Load the workshop Types if they weren't passed in
        if (!this.options.workshopTypes) {
            const response = await getWorkshopTypes()
            this.options.workshopTypes = response.data
        }

        // Get the remove icon if it wasnt passed in
        if (!this.options.cardRemoveIcon) {
            let iconData = await getIconData('remove')
            this.options.cardRemoveIcon = iconData
        }

        // Set the text font sizes
        if (this.options.width && this.options.height) {
            const minDimension = Math.min(this.options.width, this.options.height);

            this.titleFontSize = minDimension * 0.1;
            this.bodyFontSize = minDimension * 0.08;
        }

        this.workshopDifficulty = this.options.difficultyLevels.find(level => level.id === this.workshop.difficulty_id)
        this.workshopType = this.options.workshopTypes.find(type => type.id === this.workshop.workshop_type_id)

        return true
    }

    async element() {
         if (!await this.init()) {
            return null
         }

        // Set the background colour based on the difficulty level
        const workshopCard = document.createElement('div')
        workshopCard.classList.add('workshop-card')
        if (this.workshopDifficulty !== null && this.workshopDifficulty !== undefined) {
            workshopCard.style.backgroundColor = hexToRgba(this.workshopDifficulty.display_colour, 0.5)
        } else if (this.workshopType !== null && this.workshopType !== undefined) {
            workshopCard.style.backgroundColor = hexToRgba(this.workshopType.display_colour, 0.5)
        }

        if (this.options.backgroundColour !== null && this.options.backgroundColour !== undefined) {
            workshopCard.style.backgroundColor = hexToRgba(this.options.backgroundColour, 0.5)
        }

        // Set the size of the card based on the options
        workshopCard.style.width = `${this.options.width}px`
        workshopCard.style.height = `${this.options.height}px`

        // Build the contents of the card
        const workshopTitleContainer = document.createElement('div')
        workshopTitleContainer.classList.add('workshop-title-container')

        const workshopTitleContainerPaddingColumn = document.createElement('div')
        workshopTitleContainerPaddingColumn.classList.add('workshop-title-action-column')
        workshopTitleContainer.appendChild(workshopTitleContainerPaddingColumn)

        const workshopTitle = document.createElement('p')
        workshopTitle.classList.add('workshop-title', 'workshop-title-column', 'truncate')
        workshopTitle.style.webkitLineClamp = '4'
        workshopTitle.innerText = this.workshop.name
        workshopTitle.style.fontSize = `${this.titleFontSize}px`
        workshopTitleContainer.appendChild(workshopTitle)

        const workshopTitleContianerRemove = document.createElement('div')
        workshopTitleContianerRemove.classList.add('workshop-title-action-column')
        // If a workshop card needs a remove button, add it
        if (this.options.remove) {
            let removeButton = document.createElement('div')
            if (this.options.cardRemoveIcon) {
                removeButton.innerHTML = this.options.cardRemoveIcon
                let icon = removeButton.querySelector('svg')
                if (icon) {
                    icon.classList.remove('icon-tabler-trash')
                    icon.classList.add('icon-bin-session')
                }
            }
            if (this.options.sessionId != null) {
                workshopCard.id = `session-${this.options.sessionId}-workshop-${this.workshop.id}`
                removeButton.onclick = () => {
                    if (this.options.cardRemoveFunc && this.options.sessionId && this.options.scheduleGrid) {
                        this.options.cardRemoveFunc(this.options.sessionId, this.options.scheduleGrid)
                        return true
                    }
                }
            }

            workshopTitleContianerRemove.appendChild(removeButton)
        }

        if (this.options.showAttendeeSignupCounts) {
            let attendanceCount = document.createElement('h2')
            attendanceCount.id = `session-attendance-${this.options.sessionId}`

            workshopTitleContianerRemove.appendChild(attendanceCount)
        }

        workshopTitleContainer.appendChild(workshopTitleContianerRemove)

        let availableHeight = 0

        let workshopBody;
        let workshopActionButton = document.createElement('div')

        if (this.options.cardBodyActionFunc && (this.options.cardBodyActionText || this.options.cardBodyActionIcon)) {
            workshopActionButton.innerText = this.options.cardBodyActionText
            if (this.options.cardBodyActionIcon) {
                workshopActionButton.innerHTML += this.options.cardBodyActionIcon
            }

            workshopCard.onclick = () => {
                this.options.cardBodyActionFunc()
            }

            workshopCard.classList.add('workshop-body-action')

            // If there is an action button, adjust availavle height for body text
            availableHeight -= this.calculateElementHeight(workshopActionButton)
        }

        if (!this.options.cardBodyElement) {
            workshopBody = document.createElement('p')
            if (!this.options.cardBodyText) {
                workshopBody.innerHTML = this.workshop.description
            } else {
                workshopBody.innerHTML = this.options.cardBodyText
            }
            workshopBody.style.fontSize = `${this.bodyFontSize}px`
            workshopBody.classList.add('workshop-body-text', 'truncate')

            // Set available height for body text
            if (this.options.height) {
                availableHeight = this.options.height - this.calculateElementHeight(workshopTitleContainer) - 20 // 20px for some padding
            }

            // Calculate the max number of lines for the body text
            let maxLines = Math.floor(availableHeight / (this.bodyFontSize * 1.2))
            workshopBody.style.webkitLineClamp = `${maxLines-1}`
        } else {
            workshopBody = this.options.cardBodyElement
        }

        workshopCard.appendChild(workshopTitleContainer)
        workshopCard.appendChild(workshopBody)

        if (this.options.cardBodyActionFunc && (this.options.cardBodyActionText || this.options.cardBodyActionIcon)) {
            workshopCard.appendChild(workshopActionButton)
        }

        return workshopCard
    }

    calculateElementHeight(element:HTMLElement, containerStyles:ContainerStyles = {}) {
        // Create a temporary container to hold the element off-screen
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.visibility = 'hidden';
        tempContainer.style.height = 'auto'; // Allow auto height calculation
        tempContainer.style.width = containerStyles.width || 'auto'; // Apply any necessary container width
        tempContainer.style.left = '-9999px'; // Place off-screen
    
        // Apply any additional styles to the container
        Object.assign(tempContainer.style, containerStyles);
    
        // Append the element to the temporary container
        tempContainer.appendChild(element);
    
        // Append the temporary container to the body
        document.body.appendChild(tempContainer);
    
        // Get the offsetHeight of the element
        const height = element.offsetHeight;
    
        // Remove the temporary container from the DOM
        document.body.removeChild(tempContainer);
    
        return height;
    }
}