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
        if (typeof value === 'string' && value.startsWith('$~')) {
            const refKey = value.slice(2) // Extract the reference key after '$~'
            if (params[refKey] !== undefined) {
                references[key] = refKey // Track the reference
                continue
            }
        } else { 
            let processedValue = value

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

export function isEmptyOrSpaces(str){
    return str === null || str.match(/^ *$/) !== null;
}
















