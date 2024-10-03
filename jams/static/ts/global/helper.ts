import {Toast} from "@global/sweet_alert"
import { InputValidationPattern, QueryStringData } from "./interfaces";
import { User } from "./endpoints_interfaces";
import { getUsersPublicInfo } from "./endpoints";

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
                const filteredValues = processedValue.filter(item => item !== null && item !== undefined && item !== '')
                processedValue = filteredValues.flat().join(orSeparator)
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
export function createDropdown(options:any[], defualtOptionText:string, onChangeFunc:OnAnyFunc):HTMLSelectElement {
    const select = document.createElement('select')
    const defaultOptionsElement = document.createElement('option');
    defaultOptionsElement.innerText = defualtOptionText
    defaultOptionsElement.disabled = true;
    defaultOptionsElement.selected = true;
    defaultOptionsElement.hidden = true;
    const defaultOptionData = options.filter(op => op.name === defualtOptionText)
    if (defaultOptionData.length > 0) {
        defaultOptionsElement.value = defaultOptionData[0].id;
    }
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

export function buildArchiveActivateButtonForModel(modelId:number, modelActive:boolean, archiveModelFunc:ModelModityFunc, activateModelFunc:ModelModityFunc) {
    if (modelActive) {

        let archiveButton = document.createElement('button')
        archiveButton.id = `archive-${modelId}`
        archiveButton.classList.add('btn', 'btn-danger', 'py-1', 'px-2', 'mb-1')
        archiveButton.innerHTML = 'Archive'
        archiveButton.onclick = function () {
            archiveModelFunc(modelId)
        }
        archiveButton.style.padding = '10px'
        return archiveButton
    } else {
        let activateButton = document.createElement('button')
        activateButton.id = `activate-${modelId}`
        activateButton.classList.add('btn', 'btn-success', 'py-1', 'px-2', 'mb-1')
        activateButton.innerHTML = 'Activate'
        activateButton.onclick = function () {
            activateModelFunc(modelId)
        }
        activateButton.style.padding = '10px'
        return activateButton
    }
}

export function buildActionButtonsForModel(modelId:number, modelActive:boolean, archiveModelFunc:ModelModityFunc, activateModelFunc:ModelModityFunc, editModalId:string, prepEditFunc:ModelModityFunc) {
    let container = document.createElement('div')
    if (modelActive) {
        container.appendChild(buildEditButtonForModel(modelId, editModalId, prepEditFunc))
    }

    const archiveActivateButton = buildArchiveActivateButtonForModel(modelId, modelActive, archiveModelFunc, activateModelFunc)
    container.appendChild(archiveActivateButton)

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

export function warningToast(message:string) {
    Toast.fire({
        icon: 'warning',
        title: message
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

  export function getSelectedDropdownText(select:HTMLSelectElement):string|null {
    if (select.selectedIndex === -1) {
        return null
    }
    return select.options[select.selectedIndex].text
  }

  export function addSpinnerToElement(element:HTMLElement) {
    let div = document.createElement('div')
    div.classList.add('spinner-border')
    element.appendChild(div)
    return element
  }

  export function removeSpinnerFromElement(element:HTMLElement) {
    const spinner = element.querySelector('.spinner-border')
    if (spinner === undefined || spinner === null) {
        return element
    }
    element.removeChild(spinner)
    return element
  }

  export function buildRadioInputSelectionGroup(title:string, subText:string, value:string, inputName:string, checked:boolean=false, onInputChangeFunc:((value:string) => void)=null, radio:boolean=true): HTMLDivElement {
    let optionDiv = document.createElement('div')
        optionDiv.classList.add('col-lg-6')

        let label = document.createElement('label')
        label.classList.add('form-selectgroup-item')

        let input = document.createElement('input') as HTMLInputElement
        input.type = radio ? 'radio' : 'checkbox'
        input.value = value
        input.classList.add('form-selectgroup-input')
        input.name = inputName
        input.checked = checked
        if (onInputChangeFunc !== null && onInputChangeFunc !== undefined) {
            input.onchange = () => {
                onInputChangeFunc(value)
            }
        }
        label.appendChild(input)

        let span1 = document.createElement('span')
        span1.classList.add('form-selectgroup-label', 'd-flex', 'align-items-center', 'p-3')
        let span2 = document.createElement('span')
        span2.classList.add('me-3')
        let span3 = document.createElement('span')
        span3.classList.add('form-selectgroup-check')
        span2.appendChild(span3)
        span1.appendChild(span2)

        let span4 = document.createElement('span')
        span4.classList.add('form-selectgroup-label-content')
        let optionTitle = document.createElement('span')
        optionTitle.classList.add('form-selectgroup-title', 'strong', 'mb-1')
        optionTitle.innerHTML = title
        let optionDescription = document.createElement('span')
        optionDescription.classList.add('d-block', 'text-secondary')
        optionDescription.innerHTML = subText
        span4.appendChild(optionTitle)
        span4.appendChild(optionDescription)

        span1.appendChild(span4)
        label.appendChild(span1)

        optionDiv.appendChild(label)
        return optionDiv
  }

  export function getRadioInputGroupSelection(groupContainer:HTMLElement, inputName:string) {
    const selectedRadio = groupContainer.querySelector(`input[name="${inputName}"]:checked`) as HTMLInputElement|null
    const selectedValue = selectedRadio ? selectedRadio.value : null
    return selectedValue
  }

  
  export function getCheckboxInputGroupSelection(groupContainer:HTMLElement, inputName:string) {
    const selectedBoxes = groupContainer.querySelectorAll(`input[name="${inputName}"]:checked`) as NodeListOf<HTMLInputElement>|null
    let selectedValues:string[] = [];
    selectedBoxes.forEach(checkbox => {
        const value = checkbox?.value ?? null;
        if (value !== null) {
            selectedValues.push(value)
        }
    })
    
    return selectedValues
  }

  export function validateTextInput(inputElement:HTMLInputElement, regexPatterns:InputValidationPattern[]|null=null, allowSpecialCharacters:boolean=false, allowEmpty:boolean=false):boolean {
    const inputContainer:HTMLElement = inputElement.parentElement
    if (!inputContainer) {
        return false
    }

    

    if (!allowEmpty) {
        if (isNullEmptyOrSpaces(inputElement.value)) {
            // Empty
            markInputAsInvaid(inputElement, inputContainer, 'Input cannot be empty.')
            return false
        }
    }

    if (!allowSpecialCharacters) {
        const specialCharRegex = /[@$%^&*"{}|<>[\]\\\/]/;
        if(specialCharRegex.test(inputElement.value)) {
            markInputAsInvaid(inputElement, inputContainer, 'Special characters are not allowed, except for underscores "_" hyphens "-" and rounded brackets "()". Please update your input.')
            return false
        }
    }

    if (regexPatterns) {
        for (const {pattern, errorMessage} of regexPatterns) {
            if (pattern.test(inputElement.value)) {
                markInputAsInvaid(inputElement, inputContainer, errorMessage)
                return false
            }
        }
    }


    inputElement.classList.add('is-valid')
    inputElement.classList.remove('is-invalid')
    let errors = inputContainer.querySelectorAll('.invalid-feedback')
    for (const el of Array.from(errors)) {
        inputContainer.removeChild(el)
    }
    return true
}

export function validateNumberInput(inputElement:HTMLInputElement, allowNegatives:boolean=false, min:number|null=null, max:number|null=null) {
    const inputContainer:HTMLElement = inputElement.parentElement
    if (!inputContainer) {
        return false
    }

    if (isNullEmptyOrSpaces(inputElement.value)) {
        markInputAsInvaid(inputElement, inputContainer, 'Input must be a number')
        return false
    }

    if (!allowNegatives) {
        if (Number(inputElement.value) < 0) {
            markInputAsInvaid(inputElement, inputContainer, 'Input must be a positive number')
            return false
        }
    }

    if (min) {
        if (Number(inputElement.value) < min) {
            markInputAsInvaid(inputElement, inputContainer, `Input must be a more than or equal to ${min}`)
            return false
        }
    }

    if (max) {
        if (Number(inputElement.value) > max) {
            markInputAsInvaid(inputElement, inputContainer, `Input must be a less than or equal to ${max}`)
            return false
        }
    }

    inputElement.classList.add('is-valid')
    inputElement.classList.remove('is-invalid')
    let errors = inputContainer.querySelectorAll('.invalid-feedback')
    for (const el of Array.from(errors)) {
        inputContainer.removeChild(el)
    }
    return true
}

export function createRegexFromList(list: string[]): RegExp {
    // Escape special characters and join the strings with the '|' (OR) operator
    const escapedList = list.map(str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexPattern = `^(${escapedList.join('|')})$`;
    return new RegExp(regexPattern, 'i'); // 'i' makes the regex case-insensitive
}

export function markInputAsInvaid(inputElement:HTMLInputElement, inputContainer:HTMLElement|null=null, errorMessage:string|null=null) {
    // remove old error messages
    let oldErrors = inputContainer.querySelectorAll('.invalid-feedback')
    for (const el of Array.from(oldErrors)) {
        inputContainer.removeChild(el)
    }

    inputElement.classList.add('is-invalid')
    inputElement.classList.remove('is-valid')

    if (inputContainer) {
        let errorElement = document.createElement('div')
        errorElement.classList.add('invalid-feedback')

        if (errorMessage) {
            errorElement.innerHTML = errorMessage
        } else {
            errorElement.innerHTML = 'Invalid Input.'
        }

        inputContainer.appendChild(errorElement)
    }
}

export function debounce(func:Function, wait:number) {
    let timeout:number|undefined
    return function(this:any, ...args:any[]) {
        if (timeout) clearTimeout(timeout)
            timeout = window.setTimeout(() => func.apply(this, args), wait)
    }
}

export function animateElement(element:HTMLElement, animationClass:string) {
    element.classList.add(animationClass)

    const handleAnimationEnd = () => {
        element.classList.remove(animationClass)
        element.removeEventListener('animationend', handleAnimationEnd)
    }

    element.addEventListener('animationend', handleAnimationEnd)
}

// Formats a date from numbers to words (24-09-15 to 15th Spetember 2024)
export function formatDate(dateString:string) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    
    // Function to get the ordinal suffix for the day
    function getOrdinalSuffix(n:any) {
        if (n > 3 && n < 21) return 'th';
        switch (n % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
    
    const dayWithSuffix = day + getOrdinalSuffix(day);
    
    return `${dayWithSuffix} ${month} ${year}`;
}

export function formatDateToShort(dateString: string): string {
    const date = new Date(dateString);

    // Get the day, month, and year
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = String(date.getUTCFullYear()).slice(-2); // Get last 2 digits of the year

    return `${day}/${month}/${year}`;
}

export function buildUserAvatar(UserAvatarInfo:Partial<User>|null=null, size:number|null=null, customText:string|null=null):HTMLSpanElement {
    let avatar = document.createElement('span')
    avatar.classList.add('avatar')
    if (!customText && UserAvatarInfo) {
        if (UserAvatarInfo.avatar_url) {
            avatar.style.backgroundImage = `url(${UserAvatarInfo.avatar_url})`
        } else {
            let userInitials;
            if (UserAvatarInfo.first_name) {
                userInitials = `${UserAvatarInfo.first_name.toUpperCase()[0]}${UserAvatarInfo.last_name.toUpperCase()[0]}`
            } else {
                userInitials = UserAvatarInfo.display_name.toUpperCase()[0]
            }
            
            avatar.innerHTML = userInitials
        }
    } else {
        avatar.innerHTML = customText
    }

    if (size) {
        avatar.style.width = `${size}px`
        avatar.style.height = `${size}px`
    }

    return avatar
}

export async function preloadUsersInfoMap() {
    let usersInfoMap:Record<number, Partial<User>> = {}

    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }
    const queryString = buildQueryString(queryData)
    const usersInfoResponse = await getUsersPublicInfo(queryString)

    usersInfoResponse.data.forEach(userInfo => {
        usersInfoMap[userInfo.id] = userInfo
    })

    return usersInfoMap
}

export function isTouchDevice() {
    return (('ontouchstart' in window) ||
       (navigator.maxTouchPoints > 0));
  }
