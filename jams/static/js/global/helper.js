import {
    getIconData
} from './endpoints.js'

export function buildQueryString(params) {
    // Make sure params have a value
    if (params === null || params === undefined) {
        return null
    }

    // Initialise the query string and the helper objects
    let queryString = ''
    const orSeparator = '|'
    const paramSeparator = '&'
    const fieldValues = {}
    const references = {}
    const referencedFields = {}

    // Process each key, value pair in the params object
    for (const [key, value] of Object.entries(params)) {
        let processedValue = value
        // Check if value is empty
        if (isNullEmptyOrSpaces(value)) {
            continue
        }
        if (typeof value === 'string' && value.startsWith('$~')) {
            const refKey = value.slice(2) // Extract the reference key after '$~'
            if (params[refKey] !== undefined) {
                references[key] = refKey // Track the reference
                continue
            }
        } else { 
            // Handle any null or undefined values and replace them with 'None'
            if (processedValue === null || processedValue === undefined) {
                processedValue = 'None'
            }

            // Handle array values by joining them with the OR symbol '|'
            if (Array.isArray(processedValue)) {
                processedValue = processedValue.join(orSeparator)
            }
            // Convert objects into JSON strings
            else if (typeof processedValue === 'object') {
                processedValue = JSON.stringify(processedValue)
            }

            // Store the processed value
            fieldValues[key] = processedValue
        }
    }

    // Map fields that use other 'fields' values as references
    for (const [key, refKey] of Object.entries(references)) {
        if (referencedFields[refKey]) {
            referencedFields[refKey].push(key)
        } else {
            referencedFields[refKey] = [key]
        }
    }


    // Build the query string from the processed fields
    const parts = []
    for (const [key, value] of Object.entries(fieldValues)) {
        let fieldNames = [key]
        // Include all fields that reference this field's value
        if (referencedFields[key] !== undefined) {
            for (const keyRef of referencedFields[key]) {
                fieldNames.push(keyRef)
            }
        }


        let queryField = fieldNames.join(orSeparator)
        parts.push(`${queryField}=${value}`)
    }

    // Join all the key-value pairs with '&'
    queryString = parts.join(paramSeparator)
    return queryString

}

export function isNullEmptyOrSpaces(input){
    if (input === null || input === undefined) {
        return true;
    }

    if (typeof input === 'string') {
        return input.trim().length === 0;
    }

    if (Array.isArray(input)) {
        return input.length === 0 || input.every(isNullEmptyOrSpaces);
    }

    return false;
}

// Empties all children from a html element
export function emptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

// Function to convert hex to rgba
export function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Can be added to an element to allow drop
export function allowDrop(ev) {
    ev.preventDefault();
}

// Creates a promise that only resolves when an element animation is done
export function waitForTransitionEnd(element) {
    return new Promise(resolve => {
        const handler = () => {
            element.removeEventListener('transitionend', handler);
            resolve();
        };
        element.addEventListener('transitionend', handler);
    });
}

// Builds a workshop card from some inputs and options
export async function buildWorkshopCard(workshop, sessionId=null, difficultyLevels=null, cardOptions=null) {
    // Set options (use defaults for options not provided)
    let {
        size = 150,
        remove = false,
        cardRemoveIcon = null,
        cardRemoveFunc = null,
        cardActionText = null,
        cardActionIcon = null,
        cardActionFunc = null,
        scheduleGrid = null
    } = cardOptions

    const options = {
        size,
        remove,
        cardRemoveIcon,
        cardRemoveFunc,
        cardActionText,
        cardActionIcon,
        cardActionFunc,
        scheduleGrid
    }

    // If the workshop wasn't passed it, return null as we can't create a card without them
    if (!workshop) {
        return null
    }

    // Load the difficulty levels if they weren't passed in
    if (!difficultyLevels) {
        difficultyLevels = getDifficultyLevels()
    }

    // Get the remove icon if it wasnt passed in
    if (!options.cardRemoveIcon) {
        let iconData = await getIconData('remove')
        options.cardRemoveIcon = iconData
    }

    let workshopDifficulty = difficultyLevels.find(level => level.id === workshop.difficulty_id)

    // Set the background colour based on the difficulty level
    const workshopCard = document.createElement('div')
    workshopCard.classList.add('workshop-card')
    if (workshopDifficulty != null) {
        workshopCard.style.backgroundColor = hexToRgba(workshopDifficulty.display_colour, 0.5)
    }

    // Set the size of the card based on the options
    workshopCard.style.width = `${size}px`
    workshopCard.style.height = `${size}px`

    // Build the contents of the card
    const workshopTitleContainer = document.createElement('div')
    workshopTitleContainer.classList.add('workshop-title-container')

    const workshopTitleContainerPaddingColumn = document.createElement('div')
    workshopTitleContainerPaddingColumn.classList.add('workshop-title-column')
    workshopTitleContainer.appendChild(workshopTitleContainerPaddingColumn)

    const workshopTitle = document.createElement('p')
    workshopTitle.classList.add('workshop-title', 'workshop-title-column')
    workshopTitle.innerText = workshop.name
    workshopTitleContainer.appendChild(workshopTitle)

    const workshopDescription = document.createElement('p')
    workshopDescription.innerHTML = workshop.description
    workshopDescription.classList.add('truncate')


    const workshopTitleContianerRemove = document.createElement('div')
    workshopTitleContianerRemove.classList.add('workshop-title-column')
    // If a workshop card needs a remove button, add it
    if (remove) {
        let removeButton = document.createElement('div')
        removeButton.innerHTML = options.cardRemoveIcon
        let icon = removeButton.querySelector('svg')
        icon.classList.remove('icon-tabler-trash')
        icon.classList.add('icon-bin-session')
        if (sessionId != null) {
            workshopCard.id = `session-${sessionId}-workshop-${workshop.id}`
        
            removeButton.onclick = () => {
                options.cardRemoveFunc(sessionId, options.scheduleGrid)
                return true
            }
        }

        workshopTitleContianerRemove.appendChild(removeButton)
    }

    workshopTitleContainer.appendChild(workshopTitleContianerRemove)

    workshopCard.appendChild(workshopTitleContainer)
    workshopCard.appendChild(workshopDescription)

    return workshopCard
}

// Creates a generic dropdown based on inputs
export function createDropdown(options, defualtOptionText, onChangeFunc) {
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