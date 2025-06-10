import {Toast} from "@global/sweet_alert"
import { dateTimeFormatterOptions, FireListEntryType, InputValidationPattern, QueryStringData } from "./interfaces";
import { Event, Role, User } from "./endpoints_interfaces";
import { getEventsField, getUsersPublicInfo } from "./endpoints";

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

export function buildQueryString(params:QueryStringParams, allowNull:boolean=true):string|null {
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
        // Check if value is null or empty
        if (!allowNull && (!isNullEmptyOrSpaces(value) && !Array.isArray(value))) {
            continue
        }

        if (typeof value === 'string') {
            if (value.trim().length === 0) {
                continue
            }
        }

        let processedValue = value

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
                if (filteredValues.length === 0) {
                    continue
                }
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
export function hexToRgba(hex:string, alpha:number=1):string {
    if (hex === null || hex === undefined) {
        return 'rgba(0, 0, 0, 0)';
    }
    
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

type OnAnyFunc = (ev: globalThis.Event) => void
// Creates a generic dropdown based on inputs
export function createDropdown(options:any[], defaultOptionText:string, onChangeFunc:OnAnyFunc, defaultValue:any=null):HTMLSelectElement {
    const select = document.createElement('select')
    const defaultOptionsElement = document.createElement('option');
    defaultOptionsElement.innerText = defaultOptionText
    defaultOptionsElement.disabled = true;
    defaultOptionsElement.selected = true;
    defaultOptionsElement.hidden = true;
    const defaultOptionData = options.filter(op => op.name === defaultOptionText)
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

    if (defaultValue !== null) {
        select.value = defaultValue
    }

    return select
}

export function buildEditButtonForModel(modelId:number, editModalId:string, prepEditFunc:ModelModityFunc) {
    let button = document.createElement('button')
    button.id = `edit-${modelId}`
    button.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
    button.style.marginRight = '10px'
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

  export function setRadioInputGroupSelection(groupContainer: HTMLElement, inputName: string, value: string): void {
    const radioButtons = groupContainer.querySelectorAll(`input[name="${inputName}"]`) as NodeListOf<HTMLInputElement>;
    radioButtons.forEach(radio => {
        radio.checked = radio.value === value;
    });
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
        let isValid:boolean = false
        let lastInvalidErrorMessage:string = 'Invalid Input'
        for (const {pattern, errorMessage, match} of regexPatterns) {
            const doesMatch = pattern.test(inputElement.value);

            if ((match === true && doesMatch) ||
            (match === false && !doesMatch) ||
            (match === undefined && !doesMatch)) {
            // If the value passes the criteria, it's valid.
            markInputAsValid(inputElement, inputContainer)
            return true;
            } else {
                // Otherwise, mark it as invalid with the error message.
                isValid = false
                lastInvalidErrorMessage = errorMessage
            }
        }

        if (!isValid) {
            markInputAsInvaid(inputElement, inputContainer, lastInvalidErrorMessage)
            return false
        }
    }


    markInputAsValid(inputElement, inputContainer)
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

    markInputAsValid(inputElement, inputContainer)
    return true
}

export function createRegexFromList(list: string[]): RegExp {
    // Escape special characters and join the strings with the '|' (OR) operator
    const escapedList = list.map(str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regexPattern = `^(${escapedList.join('|')})$`;
    return new RegExp(regexPattern, 'i'); // 'i' makes the regex case-insensitive
}

export function markInputAsValid(inputElement:HTMLInputElement, inputContainer:HTMLElement|null=null) {
    // remove old error messages
    let oldErrors = inputContainer.querySelectorAll('.invalid-feedback')
    for (const el of Array.from(oldErrors)) {
        inputContainer.removeChild(el)
    }

    inputElement.classList.add('is-valid')
    inputElement.classList.remove('is-invalid')
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

// Formats a date from numbers to words (24-09-15 to 15th September 2024 or 15th September 2024 13:30)
export function formatDate(dateString: string, options: dateTimeFormatterOptions | null = null): string {
    const {
        includeDate = true,
        includeTime = true,
        includeSeconds = true
    } = options || {}

    // Use a regular expression to capture the date and time components (handle both 'T' and ' ' separators)
    const dateParts = dateString.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:([+-]\d{2}:\d{2})|Z)?/)

    if (!dateParts) {
        throw new Error('Invalid date string format')
    }

    let formattedDate = ''

    // Function to get the ordinal suffix for the day
    function getOrdinalSuffix(n: any) {
        if (n > 3 && n < 21) return 'th'
        switch (n % 10) {
            case 1: return 'st'
            case 2: return 'nd'
            case 3: return 'rd'
            default: return 'th'
        }
    }

    // If includeDate is true, format the date part
    if (includeDate) {
        const day = parseInt(dateParts[3])  // Extract the day part (already 2 digits)
        const month = new Date(`${dateParts[1]}-${dateParts[2]}-${dateParts[3]}`).toLocaleString('default', { month: 'long' })  // Extract the month name
        const year = dateParts[1]  // Extract the full year
        const dayWithSuffix = day + getOrdinalSuffix(day)

        formattedDate += `${dayWithSuffix} ${month} ${year}`
    }

    // If includeTime is true, format the time part
    if (includeTime) {
        const hours = dateParts[4]  // Extract the hours part
        const minutes = dateParts[5]  // Extract the minutes part
        let time = `${hours}:${minutes}`

        // If includeSeconds is true, add seconds part if available
        if (includeSeconds && dateParts[6]) {
            const seconds = dateParts[6]
            time += `:${seconds}`
        }

        formattedDate += ` ${time}`
    }

    return formattedDate
}



// Formats a date to short format (DD/MM/YY) and optionally adds time (HH:MM or HH:MM:SS)
export function formatDateToShort(dateString: string, options:dateTimeFormatterOptions|null=null): string {
    const {
        isTime = false,
        includeDate = true,
        includeTime = true,
        includeSeconds = true
    } = options || {}

    if (dateString === undefined) {
        return 'N/A'
    }

    // Use a regular expression to capture the date and time components
    let dateParts: RegExpMatchArray | null = null;
    if (isTime) {
        dateParts = dateString.match(/(\d{2}):(\d{2})(?::(\d{2}))?(?:([+-]\d{2}:\d{2})|Z)?/);
    } else {
        dateParts = dateString.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:([+-]\d{2}:\d{2})|Z)?)?/);
    }

    if (!dateParts) {
        throw new Error('Invalid date string format');
    }

    let formattedDate = ''

    if (includeDate && !isTime) {
        const day = dateParts[3]  // Extract the day part (already 2 digits)
        const month = dateParts[2]  // Extract the month part (already 2 digits)
        const year = dateParts[1].slice(-2)  // Last 2 digits of the year

        formattedDate += `${day}/${month}/${year}`
    }

    // If includeTime is true, add the time part
    if (includeTime) {
        const hours = dateParts[isTime ? 1 : 4]  // Extract the hours part
        const minutes = dateParts[isTime ? 2 : 5]  // Extract the minutes part
        let time = `${hours}:${minutes}`

        if (includeSeconds && dateParts[isTime ? 3 : 6]) {
            const seconds = dateParts[isTime ? 3 : 6]
            time += `:${seconds}`
        }

        formattedDate += includeDate ? ` ${time}` : time
    }

    return formattedDate
}




export function buildUserAvatar(UserAvatarInfo:Partial<User>|null=null, size:number|null=40, customText:string|null=null, customImageUrl:string|null=null):HTMLSpanElement {
    let avatar = document.createElement('span')
    avatar.id = 'user-avatar'
    avatar.classList.add('avatar')
    if (!customText && !customImageUrl && UserAvatarInfo) {
        if (UserAvatarInfo.avatar_file_id) {
            avatar.style.backgroundImage = `url(/resources/files/${UserAvatarInfo.avatar_file_id}?t=${new Date().getTime()})`
        } else {
            let userInitials;
            if (UserAvatarInfo.first_name) {
                userInitials = `${UserAvatarInfo.first_name.toUpperCase()[0]}${UserAvatarInfo.last_name.toUpperCase()[0]}`
            } else {
                userInitials = UserAvatarInfo.display_name.toUpperCase()[0]
            }
            
            avatar.style.fontSize = `${size * 0.6}px`
            avatar.innerHTML = userInitials
        }
    } else if (!customImageUrl && customText) {
        avatar.innerHTML = customText
    } else {
        avatar.style.backgroundImage = `url(${customImageUrl})`
    }

    if (size) {
        avatar.style.width = `${size}px`
        avatar.style.minWidth = `${size}px`
        avatar.style.height = `${size}px`
        avatar.style.minHeight = `${size}px`
    }

    return avatar
}

export async function preloadUsersInfoMap(role_ids:number[]|null=null) {
    let usersInfoMap:Record<number, Partial<User>> = {}

    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }

    if (role_ids !== null) {
        queryData.role_ids = role_ids
    }
    const queryString = buildQueryString(queryData)
    const usersInfoResponse = await getUsersPublicInfo(queryString)

    usersInfoResponse.data.forEach(userInfo => {
        usersInfoMap[userInfo.id] = userInfo
    })

    return usersInfoMap
}

export function isTouchDevice() {
    const mediaQuery = window.matchMedia("(pointer: coarse)")
    let isTouch = mediaQuery.matches

    return isTouch
}

export function roundNumber(input:number, decimalPoints:number=2) {
    return (Math.round(input * 100) / 100).toFixed(decimalPoints)
}

export function combineDateTime(dateStr:string, timeStr:string) {
    if (dateStr && timeStr) {
        const dateTimeStr = `${dateStr}T${timeStr}:00`

        return dateTimeStr
    }
}

export function convertToDateInputFormat(dateString: string): string {
    const [day, month, year] = dateString.split('/').map(Number);

    // Create a new Date object with the correct values
    const date = new Date(year + 2000, month - 1, day);

     // Get the year, month, and day in the required format
     const formattedYear = date.getFullYear();
     const formattedMonth = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
     const formattedDay = String(date.getDate()).padStart(2, '0');

    // Return in yyyy-MM-dd format
    return `${formattedYear}-${formattedMonth}-${formattedDay}`;
}

export function stringToFireListEntryType(type: string | null): FireListEntryType | null {
    switch (type) {
        case 'ATTENDEE':
            return FireListEntryType.ATTENDEE;
        case 'VOLUNTEER':
            return FireListEntryType.VOLUNTEER;
        case 'GUEST':
            return FireListEntryType.GUEST;
        default:
            return null;
    }
}

export function buildRoleBadge(role:Partial<Role>, roleText:string=null, usePointer:boolean=false) {
    const container = document.createElement('span')

    if (!role && !roleText) {
        return container
    }
    
    container.classList.add('tag-with-indicator')
    container.style.width = 'fit-content'
    container.style.borderRadius = '90px'

    if (usePointer) {
        container.style.cursor = 'pointer'
    }

    const text = document.createElement('span')
    if (!role) {
        text.innerHTML = roleText
        container.appendChild(text)
    } else {
        text.innerHTML = role.name

        const badge = document.createElement('span')
        badge.classList.add('badge', 'ms-2')
        badge.style.backgroundColor = hexToRgba(role.display_colour)

        container.appendChild(text)
        container.appendChild(badge)
    }

    return container
}

export function compressImage(file:File, maxWidth:number, maxHeight:number, quality:number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)

        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string

            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                if (width > maxWidth || height > maxHeight) {
                    const scale = Math.min(maxWidth / width, maxHeight / height)
                    width *= scale
                    height *= scale
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    return reject(new Error('Canvas not supported'))
                }

                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Image compression failed'))
                        }
                    },
                    'image/jpeg',
                    quality
                )
            }
            img.onerror = (err) => reject(err)
        }
        reader.onerror = (err) => reject(err)
    })
}

export function eventDropdownItemText(event:Partial<Event>) {
    const date = (event.date)
    return `${event.name} - ${formatDateToShort(date, {includeTime:false})}`
}

export async function preLoadEventDetails() {
        const queryData:Partial<QueryStringData> = {
            $order_by: 'date',
            $order_direction: 'DESC'
        }
        const queryString = buildQueryString(queryData)
        const namesResponse = await getEventsField('name', queryString)
        const datesResponse = await getEventsField('date', queryString)
        let eventNames = namesResponse.data
        let eventDates = datesResponse.data

        if (!eventNames || !eventDates) {
            return null
        }

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

export function createEventSelectionDropdown(currentEventId:number, eventDetailsMap:Record<number, Partial<Event>>, eventOnChangeFunc:((eventId:number) => any)) {
    let eventSelectionDropdown = document.createElement('div')

    let dropdownButton = document.createElement('a')
    dropdownButton.id = 'select-event-dropdown-button'
    dropdownButton.classList.add('btn', 'dropdown-toggle')
    dropdownButton.setAttribute('data-bs-toggle', 'dropdown')
    dropdownButton.innerHTML = 'Select Event'
    if (currentEventId && currentEventId !== -1) {
        dropdownButton.innerHTML = eventDropdownItemText(eventDetailsMap[currentEventId])
    }

    eventSelectionDropdown.appendChild(dropdownButton)

    let dropdown = document.createElement('div')
    dropdown.id = 'select-event-dropdown'
    dropdown.classList.add('dropdown-menu')

    const sortedEvents = Object.values(eventDetailsMap)
            .map(event => event as Partial<Event>)
            .sort((eventA, eventB) => 
                new Date(eventB.date).getTime() - new Date(eventA.date).getTime()
    )

    sortedEvents.forEach((event:Partial<Event>) => {
        let item = document.createElement('a')
        item.classList.add('dropdown-item')

        let text = document.createElement('span')
        text.innerHTML = eventDropdownItemText(event)

        item.appendChild(text)

        item.onclick = () => {
            eventOnChangeFunc(Number(event.id))
        }

        dropdown.appendChild(item)
    })

    eventSelectionDropdown.appendChild(dropdown)

    return eventSelectionDropdown
}

export function cloneMap<T>(
    inputMap: Record<string | number, T>,
    cloneFn?: (value: T) => T
): Record<string | number, T> {
    const tmpMap: Record<string | number, T> = {};
    for (const [key, value] of Object.entries(inputMap)) {
        tmpMap[key] = cloneFn ? cloneFn(value) : value
    }
    return tmpMap
}