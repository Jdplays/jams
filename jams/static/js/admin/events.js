function GetEvents() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events',
            type: 'GET',
            success: function(response) {
                resolve(response.events);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function GetEvent(eventID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/' + eventID,
            type: 'GET',
            success: function(response) {
                resolve(response);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function AddNewEvent(data) {
    $.ajax({
        type: 'POST',
        url: '/backend/events',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: async function(response) {
            await PopulateEventsTable();
            document.getElementById('events-request-response').innerHTML = response.message
        }
    });
}

function EditEvent(eventID, data) {
    $.ajax({
        type: 'PATCH',
        url: '/backend/events/' + eventID,
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: async function(response) {
            await PopulateEventsTable();
            document.getElementById('events-request-response').innerHTML = response.message
        }
    });
}

function ArchiveEvent(eventID) {
    $.ajax({
        type: 'POST',
        url: '/backend/events/' + eventID + '/archive',
        success: async function(response) {
            await PopulateEventsTable();
            document.getElementById('events-request-response').innerHTML = response.message
        }
    });
}

function ActivateEvent(eventID) {
    $.ajax({
        type: 'POST',
        url: '/backend/events/' + eventID + '/activate',
        success: async function(response) {
            await PopulateEventsTable();
            document.getElementById('events-request-response').innerHTML = response.message
        }
    });
}


function AddEventOnClick() {
    const data = {
        'name': document.getElementById('add-event-name').value,
        'description': document.getElementById('add-event-description').value,
        'date': document.getElementById('add-event-date').value,
        'password': document.getElementById('add-event-password').value,
    }

    AddNewEvent(data)
}

function EditEventOnClick() {
    eventID = document.getElementById('edit-event-id').value
    const data = {
        'name': document.getElementById('edit-event-name').value,
        'description': document.getElementById('edit-event-description').value,
        'date': document.getElementById('edit-event-date').value,
        'password': document.getElementById('edit-event-password').value,
    }

    EditEvent(eventID, data)
}

async function PrepEditEventForm(eventID) {
    let event = await GetEvent(eventID)

    document.getElementById('edit-event-id').value = event.id
    document.getElementById('edit-event-name').value = event.name
    document.getElementById('edit-event-description').innerText = event.description
    document.getElementById('edit-event-date').value = event.date
    document.getElementById('edit-event-password').value = event.password
}

function CreateAndAppendCell(row, content) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

async function PopulateEventsTable() {
    let allEvents = await GetEvents()

    $('#events-table tbody').empty();

    for (const event of allEvents) {
        
        actionsButtons = document.createElement('div')

        if (event.active) {
            // Archive button
            archiveButton = document.createElement('button')
            archiveButton.onclick = function () {
                ArchiveEvent(event.id)
            }
            archiveButton.innerHTML = 'Archive'
            archiveButton.className  = 'btn btn-danger'
            
            // Add Buttonsto div
            actionsButtons.appendChild(archiveButton)
        }
        else {
            // Activate button
            activeateButton = document.createElement('button')
            activeateButton.onclick = function () {
                ActivateEvent(event.id)
            }
            activeateButton.innerHTML = 'Activate'
            activeateButton.className  = 'btn btn-success'
            
            // Add Button to div
            actionsButtons.appendChild(activeateButton)
            
        }

        // Edit button
        editButton = document.createElement('button')
        editButton.disabled = !event.active
        editButton.innerHTML = 'Edit'
        editButton.className  = 'btn btn-secondary'
        editButton.setAttribute('data-bs-toggle', 'modal');
        editButton.setAttribute('data-bs-target','#edit-event-modal')
        editButton.onclick = function() {
            PrepEditEventForm(event.id)
        }

        actionsButtons.appendChild(editButton)


        var row = document.createElement('tr')
        CreateAndAppendCell(row, event.name)
        CreateAndAppendCell(row, event.description)
        CreateAndAppendCell(row, event.date)
        CreateAndAppendCell(row, event.password)
        row.appendChild(actionsButtons)

        $('#events-table').append(row);
    };
}

// Event listeners
document.addEventListener("DOMContentLoaded", PopulateEventsTable);