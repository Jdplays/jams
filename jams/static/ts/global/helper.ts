import {Toast} from "../global/sweet_alert"

type QueryStringParams = {[key: string]: any}
type ModelModityFunc = ((arg1:number) => void)

interface FieldValues {
    [key: string]: string;
}

interface References {
    [key: string]: string;
}

interface ReferencedFields {
    [key: string]: string[];
}

export function buildQueryString(params:QueryStringParams):string|null {
    // Make sure params have a value
    if (params === null || params === undefined) {
        return null
    }

    // Initialise the query string and the helper objects
    let queryString = ''
    const orSeparator = '|'
    const paramSeparator = '&'
    const fieldValues:FieldValues = {}
    const references:References = {}
    const referencedFields:ReferencedFields = {}

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

export function isNullEmptyOrSpaces(input:any):boolean {
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
export function emptyElement(element:HTMLElement):void {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

// Function to convert hex to rgba
export function hexToRgba(hex:string, alpha:number):string {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Can be added to an element to allow drop
export function allowDrop(ev:DragEvent):void {
    ev.preventDefault();
}

// Creates a promise that only resolves when an element animation is done
export function waitForTransitionEnd(element:HTMLElement):Promise<void> {
    return new Promise<void>(resolve => {
        const handler = () => {
            element.removeEventListener('transitionend', handler);
            resolve();
        };
        element.addEventListener('transitionend', handler);
    });
}

type OnAnyFunc = (ev: Event) => void
// Creates a generic dropdown based on inputs
export function createDropdown(options:any, defualtOptionText:string, onChangeFunc:OnAnyFunc):HTMLSelectElement {
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

export function buildEditButtonForModel(modelId:number, editModalId:string, prepEditFunc:ModelModityFunc) {
    let button = document.createElement('button')
    button.id = `edit-${modelId}`
    button.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
    button.innerHTML = 'Edit'
    button.setAttribute('data-bs-toggle', 'modal')
    button.setAttribute('data-bs-target', `#${editModalId}`)
    button.onclick = function () {
        prepEditFunc(modelId)
    }
    button.style.padding = '10px'

    return button
}

export function buildActionButtonsForModel(modelId:number, modelActive:boolean, archiveModelFunc:ModelModityFunc, activateModelFunc:ModelModityFunc, editModalId:string, prepEditFunc:ModelModityFunc) {
    let container = document.createElement('div')
    if (modelActive) {
        container.appendChild(buildEditButtonForModel(modelId, editModalId, prepEditFunc))

        let archiveButton = document.createElement('button')
        archiveButton.id = `archive-${modelId}`
        archiveButton.classList.add('btn', 'btn-danger', 'py-1', 'px-2', 'mb-1')
        archiveButton.innerHTML = 'Archive'
        archiveButton.onclick = function () {
            archiveModelFunc(modelId)
        }
        archiveButton.style.padding = '10px'
        container.appendChild(archiveButton)
    } else {
        let activateButton = document.createElement('button')
        activateButton.id = `activate-${modelId}`
        activateButton.classList.add('btn', 'btn-success', 'py-1', 'px-2', 'mb-1')
        activateButton.innerHTML = 'Activate'
        activateButton.onclick = function () {
            activateModelFunc(modelId)
        }
        activateButton.style.padding = '10px'
        container.appendChild(activateButton)
    }

    return container
}

export function successToast(message:string) {
    Toast.fire({
        icon: 'success',
        title: message
    })
}

export function errorToast(message:string|null=null) {
    Toast.fire({
        icon: 'error',
        title: message ?? 'An Error occurred!'
    })
}


export function getSelectValues(select:HTMLSelectElement) {
    var result = [];
    var options = select && select.options;
    var opt;
  
    for (var i=0, iLen=options.length; i<iLen; i++) {
      opt = options[i];
  
      if (opt.selected) {
        result.push(Number(opt.value));
      }
    }
    return result;
  }

  export const isDefined = (value:any):boolean => value !== undefined && value !== null;