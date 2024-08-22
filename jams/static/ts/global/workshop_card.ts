import { getDifficultyLevels, getIconData } from './endpoints.js'
import { DifficultyLevel, Workshop } from './endpoints_interfaces.js'
import {hexToRgba} from './helper.js'
import { ScheduleGrid } from './schedule_grid.js'

export interface WorkshopCardOptions {
    sessionId?:number|null
    difficultyLevels?:DifficultyLevel[]|null
    size?:number
    remove?:boolean
    cardRemoveIcon?:string|null
    cardRemoveFunc?:((arg1:number, arg2:any) => void)
    cardBodyText?:string|null
    cardBodyIcon?:string|null
    cardBodyActionText?:string|null
    cardBodyActionFunc?:(() => void) | null
    bodyText?:string|null
    scheduleGrid?:ScheduleGrid|null

}

type ContainerStyles = {[key: string]: any}

export class WorkshopCard {
    private workshop:Workshop
    private options:WorkshopCardOptions
    private titleFontSize:number
    private bodyFontSize:number
    private workshopDifficulty:DifficultyLevel|undefined

    constructor(workshop:Workshop, options:WorkshopCardOptions) {
        this.workshop = workshop
        this.titleFontSize = 0
        this.bodyFontSize = 0

        // Set options (use defaults for options not provided)
        let {
            sessionId = null,
            difficultyLevels = null,
            size = 150,
            remove = false,
            cardRemoveIcon = null,
            cardRemoveFunc,
            cardBodyText = null,
            cardBodyIcon = null,
            cardBodyActionText = null,
            cardBodyActionFunc = null,
            bodyText = null,
            scheduleGrid = null
        } = options

        this.options = {
            sessionId,
            difficultyLevels,
            size,
            remove,
            cardRemoveIcon,
            cardRemoveFunc,
            cardBodyText,
            cardBodyIcon,
            cardBodyActionText,
            cardBodyActionFunc,
            bodyText,
            scheduleGrid
        }

        this.initWorshopCard()
    }

    async initWorshopCard() {
        // If the workshop wasn't passed it, return null as we can't create a card without them
        if (!this.workshop) {
            return null
        }

        // Load the difficulty levels if they weren't passed in
        if (!this.options.difficultyLevels) {
            this.options.difficultyLevels = await getDifficultyLevels()
        }

        // Get the remove icon if it wasnt passed in
        if (!this.options.cardRemoveIcon) {
            let iconData = await getIconData('remove')
            this.options.cardRemoveIcon = iconData
        }

        // Set the text font sizes
        if (this.options.size) {
            this.titleFontSize = this.options.size * 0.12
            this.bodyFontSize = this.options.size * 0.08
        }

        this.workshopDifficulty = this.options.difficultyLevels.find(level => level.id === this.workshop.difficulty_id)

        return true
    }

    async element() {
         if (!await this.initWorshopCard()) {
            return null
         }

        // Set the background colour based on the difficulty level
        const workshopCard = document.createElement('div')
        workshopCard.classList.add('workshop-card')
        if (this.workshopDifficulty != null) {
            workshopCard.style.backgroundColor = hexToRgba(this.workshopDifficulty.display_colour, 0.5)
        }

        // Set the size of the card based on the options
        workshopCard.style.width = `${this.options.size}px`
        workshopCard.style.height = `${this.options.size}px`

        // Build the contents of the card
        const workshopTitleContainer = document.createElement('div')
        workshopTitleContainer.classList.add('workshop-title-container')

        const workshopTitleContainerPaddingColumn = document.createElement('div')
        workshopTitleContainerPaddingColumn.classList.add('workshop-title-column')
        workshopTitleContainer.appendChild(workshopTitleContainerPaddingColumn)

        const workshopTitle = document.createElement('p')
        workshopTitle.classList.add('workshop-title', 'workshop-title-column')
        workshopTitle.innerText = this.workshop.name
        workshopTitle.style.fontSize = `${this.titleFontSize}px`
        workshopTitleContainer.appendChild(workshopTitle)

        const workshopTitleContianerRemove = document.createElement('div')
        workshopTitleContianerRemove.classList.add('workshop-title-column')
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

        workshopTitleContainer.appendChild(workshopTitleContianerRemove)

        const workshopBodyText = document.createElement('p')
        if (!this.options.bodyText) {
            workshopBodyText.innerHTML = this.workshop.description
        } else {
            workshopBodyText.innerHTML = this.options.bodyText
        }
        workshopBodyText.style.fontSize = `${this.bodyFontSize}px`
        workshopBodyText.classList.add('workshop-body-text', 'truncate')

        // Set available height for body text
        let availableHeight = 0
        if (this.options.size) {
            availableHeight = this.options.size - this.calculateElementHeight(workshopTitleContainer) - 20 // 20px for some padding
        }
        

        const workshopActionButton = document.createElement('button')
        if (this.options.cardBodyActionFunc && this.options.cardBodyActionText) {
            workshopActionButton.classList.add('btn', 'btn-secondary')
            workshopActionButton.innerText = this.options.cardBodyActionText
            workshopActionButton.onclick = () => {
                this.options.cardBodyActionFunc
            }
            workshopActionButton.classList.add('workshop-body-action')

            // If there is an action button, adjust availavle height for body text
            availableHeight -= this.calculateElementHeight(workshopActionButton)
        }

        // Calculate the max number of lines for the body text
        let maxLines = Math.floor(availableHeight / (this.bodyFontSize * 1.2))
        //console.log(availableHeight)
        //console.log(maxLines)
        workshopBodyText.style.webkitLineClamp = `${maxLines}`

        workshopCard.appendChild(workshopTitleContainer)
        workshopCard.appendChild(workshopBodyText)

        if (this.options.cardBodyActionFunc && this.options.cardBodyActionText) {
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