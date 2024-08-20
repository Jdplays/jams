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