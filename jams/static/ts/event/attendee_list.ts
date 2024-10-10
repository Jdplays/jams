import {
    activateWorkshop,
    addAttendee,
    archiveWorkshop,
    editAttendee,
    getAttendees
} from "@global/endpoints";
import { Attendee } from "@global/endpoints_interfaces";
import { EventDetails, EventDetailsOptions } from "@global/event_details";
import { successToast, errorToast, validateTextInput, validateNumberInput, isDefined, animateElement } from "@global/helper";
import { InputValidationPattern } from "@global/interfaces";
import { createGrid, GridApi, GridOptions, RowDataTransaction } from 'ag-grid-community';

let gridApi: GridApi<any>;

let firstNameValid:boolean = false
let lastNameValid:boolean = false
let emailValid:boolean = false
let ageValid:boolean = false

// Event Details
const eventDetailsOptions:EventDetailsOptions = {
    eventDependentElements: [document.getElementById('attendees-data-grid-container')]
}
let eventDetails:EventDetails;

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        tooltipShowDelay:100,
        tooltipMouseTrack: true,
        domLayout: "autoHeight",
        getRowId: (params: any) => String(params.data.id),
        animateRows: true,
        columnDefs: [
            {
                field: 'name',
                maxWidth:120,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                pinned: true,
                flex: 1
            },
            {field: 'email', minWidth:250, tooltipValueGetter: (params:any) => params.value, flex: 1},
            {field: 'source', minWidth:150, flex: 1},
            {
                field: 'checked_in',
                headerName: 'Checked In',
                cellRenderer: 'agCheckboxCellRenderer',
                minWidth: 110,
                flex: 1
            },
            {
                field: 'registerable',
                cellRenderer: 'agCheckboxCellRenderer',
                minWidth: 120,
                flex: 1
            },
            {field: 'age', minWidth:70, flex: 1},
            {field: 'gender', minWidth:120, flex: 1},
            {
                field: 'actions',
                cellRenderer: (params:any) => {
                    if (params.data.external_id !== null) {
                        return 'N/A'
                    } else {
                        let div = document.createElement('div')
                        let editButton = document.createElement('button')
                        editButton.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
                        editButton.style.marginRight = '10px'
                        editButton.innerHTML = 'Edit'
                        editButton.setAttribute('data-bs-toggle', 'modal')
                        editButton.setAttribute('data-bs-target', '#add-update-attendee-modal')
                        editButton.onclick = () => {
                            prepEditAttendeeForm(params.data)
                        }
                        div.appendChild(editButton)

                        if (params.data.checked_in) {
                            let checkOutButton = document.createElement('button')
                            checkOutButton.classList.add('btn', 'btn-outline-danger', 'py-1', 'px-2', 'mb-1')
                            checkOutButton.innerHTML = 'Check Out'
                            checkOutButton.onclick = () => {
                                checkInOutOnClick(params.data.id, false)
                            }
                            div.appendChild(checkOutButton)
                        } else {
                            let checkInButton = document.createElement('button')
                            checkInButton.classList.add('btn', 'btn-outline-success', 'py-1', 'px-2', 'mb-1')
                            checkInButton.innerHTML = 'Check In'
                            checkInButton.onclick = () => {
                                checkInOutOnClick(params.data.id, true)
                            }
                            div.appendChild(checkInButton)
                        }
                        return div
                    }
                },
                minWidth: 160,
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('attendees-data-grid') as HTMLElement
    gridElement.style.height = `${window.innerHeight * 0.7}px`;
    gridApi = createGrid(gridElement, gridOptions)

    populateAttendeesTable()

    window.setInterval(() => {
        populateAttendeesTable()
    }, 1000)
}

async function populateAttendeesTable() {
    const allAttendeesResponse = await getAttendees(eventDetails.eventId);
    let newRowData = allAttendeesResponse.data

    const currentRowData:Attendee[] = [];
    gridApi.forEachNode(node => currentRowData.push(node.data));

    // Track the rows to be added, updated, or removed
    const transaction:RowDataTransaction = {
        add: [],
        update: [],
        remove: []
    };

    const currentRowMap = new Map<number, Attendee>();
    currentRowData.forEach(row => currentRowMap.set(row.id, row));

    // Rows to be re-rendered after the transaction
    const rowsToRedraw: any[] = [];

    newRowData.forEach(newRow => {
        const currentRow = currentRowMap.get(newRow.id);
        if (!currentRow) {
            transaction.add.push(newRow);
        } else if (JSON.stringify(currentRow) !== JSON.stringify(newRow)) {
            if (currentRow.checked_in !== newRow.checked_in) {
                // If 'checked_in' value changes, force re-render of the specific row
                rowsToRedraw.push(gridApi.getRowNode(String(currentRow.id)));
            }
            transaction.update.push(newRow);
        }
        currentRowMap.delete(newRow.id);
    });

    transaction.remove = Array.from(currentRowMap.values());

    gridApi.applyTransaction(transaction)

    // Re-render rows after the transaction is applied
    if (rowsToRedraw.length > 0) {
        gridApi.redrawRows({ rowNodes: rowsToRedraw });
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()

    if (eventDetails.eventId === -1) {
        return
    }

    initialiseAgGrid()
});

function prepAddAttendeeForm() {
    const modalTitle = document.getElementById('modal-title') as HTMLDivElement
    const addButton = document.getElementById('add-update-attendee-button') as HTMLDivElement
    addButton.onclick = addAttendeeOnClick

    const eventWarningText = document.getElementById('event-warning') as HTMLParagraphElement
    eventWarningText.innerHTML = `This Attendee will be added to: ${eventDetails.eventName()}`

    const firstNameInput = document.getElementById('first-name') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name') as HTMLInputElement
    const emailInput = document.getElementById('email') as HTMLInputElement
    const ageInput = document.getElementById('age') as HTMLInputElement
    const genderSelect = document.getElementById('gender-select') as HTMLSelectElement
    const registerableInput = document.getElementById('toggle-registerable-switch') as HTMLInputElement

    firstNameInput.value = ''
    lastNameInput.value = ''
    emailInput.value = ''
    ageInput.value = ''
    genderSelect.value = 'male'
    registerableInput.checked = false

    addButton.querySelector('.btn-text').innerHTML = 'Add Attendee'
    modalTitle.innerHTML = 'Edit Attendee'
}

function prepEditAttendeeForm(attendee:Partial<Attendee>) {
    const modalTitle = document.getElementById('modal-title') as HTMLDivElement
    const addButton = document.getElementById('add-update-attendee-button') as HTMLDivElement
    addButton.onclick = () => {
        editAttendeeOnClick(attendee.id)
    }

    const eventWarningText = document.getElementById('event-warning') as HTMLParagraphElement
    eventWarningText.innerHTML = `This Attendee will be added to: ${eventDetails.eventName()}`

    const firstNameInput = document.getElementById('first-name') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name') as HTMLInputElement
    const emailInput = document.getElementById('email') as HTMLInputElement
    const ageInput = document.getElementById('age') as HTMLInputElement
    const genderSelect = document.getElementById('gender-select') as HTMLSelectElement
    const registerableInput = document.getElementById('toggle-registerable-switch') as HTMLInputElement

    const nameParts = attendee.name.split(' ')

    firstNameInput.value = nameParts[0]
    lastNameInput.value = nameParts[1]
    emailInput.value = attendee.email
    ageInput.value = String(attendee.age)
    genderSelect.value = attendee.gender
    registerableInput.checked = attendee.registerable

    addButton.querySelector('.btn-text').innerHTML = 'Edit Attendee'
    modalTitle.innerHTML = 'Edit Attendee'
}

function addAttendeeOnClick() {
    const addButton = document.getElementById('add-update-attendee-button') as HTMLDivElement
    
    const firstNameInput = document.getElementById('first-name') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name') as HTMLInputElement
    const emailInput = document.getElementById('email') as HTMLInputElement
    const ageInput = document.getElementById('age') as HTMLInputElement
    const genderSelect = document.getElementById('gender-select') as HTMLSelectElement
    const registerableInput = document.getElementById('toggle-registerable-switch') as HTMLInputElement

    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    lastNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))
    ageInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (!firstNameValid || !lastNameValid || !emailValid || !ageValid) {
        animateElement(addButton, 'element-shake')
        return
    }

    const fullName = `${firstNameInput.value} ${lastNameInput.value}`
    
    let data:Partial<Attendee> = {
        name: fullName,
        email: emailInput.value,
        age: Number(ageInput.value),
        gender: genderSelect.value,
        registerable: registerableInput.checked,
        event_id: eventDetails.eventId
    }

    addAttendee(eventDetails.eventId, data).then((response) => {
        successToast(response.message)
        // Hide the modal
        let modal = $('#add-update-attendee-modal')
        modal.modal('hide')
    }).catch(error => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

function editAttendeeOnClick(attendeeId:number) {
    const addButton = document.getElementById('add-update-attendee-button') as HTMLDivElement
    
    const firstNameInput = document.getElementById('first-name') as HTMLInputElement
    const lastNameInput = document.getElementById('last-name') as HTMLInputElement
    const emailInput = document.getElementById('email') as HTMLInputElement
    const ageInput = document.getElementById('age') as HTMLInputElement
    const genderSelect = document.getElementById('gender-select') as HTMLSelectElement
    const registerableInput = document.getElementById('toggle-registerable-switch') as HTMLInputElement

    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    lastNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    emailInput.dispatchEvent(new Event('input', { bubbles: true }))
    ageInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (!firstNameValid || !lastNameValid || !emailValid || !ageValid) {
        animateElement(addButton, 'element-shake')
        return
    }

    const fullName = `${firstNameInput.value} ${lastNameInput.value}`
    
    let data:Partial<Attendee> = {
        name: fullName,
        email: emailInput.value,
        age: Number(ageInput.value),
        gender: genderSelect.value,
        registerable: registerableInput.checked,
        event_id: eventDetails.eventId
    }

    editAttendee(eventDetails.eventId, attendeeId, data).then((response) => {
        successToast(response.message)
        // Hide the modal
        let modal = $('#add-update-attendee-modal')
        modal.modal('hide')
    }).catch(error => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

function checkInOutOnClick(attendeeId:number, value:boolean) {
    let data:Partial<Attendee> = {
        checked_in: value
    }

    editAttendee(eventDetails.eventId, attendeeId, data).then((response) => {
        successToast(response.message)
    }).catch(error => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

document.addEventListener("DOMContentLoaded", () => {
    // Form Validation
    // First Name
    const firstNameInput = document.getElementById('first-name') as HTMLInputElement
    firstNameInput.oninput = async () => {
        firstNameValid = validateTextInput(firstNameInput, null, false)
    }

    // Last Name
    const lastNameInput = document.getElementById('last-name') as HTMLInputElement
    lastNameInput.oninput = async () => {
        lastNameValid = validateTextInput(lastNameInput, null, false)
    }

    // Email
    const emailInput = document.getElementById('email') as HTMLInputElement
    emailInput.oninput = async () => {
        let patterns:InputValidationPattern[] = null
        patterns = [
            {pattern: new RegExp(`^[\\w.-]+@([\\w-]+\\.)+[a-zA-Z]{2,4}$`, 'i'), errorMessage: 'Please input a valid email', match: true},
        ]
        emailValid = validateTextInput(emailInput, patterns, true)
    }

    // Capacity
    const ageInput = document.getElementById('age') as HTMLInputElement
    ageInput.oninput = () => {
        ageValid = validateNumberInput(ageInput, false, 1, 150)
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).prepAddAttendeeForm = prepAddAttendeeForm;
    }
});
  