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
            document.getElementById('edit-event-block').style.display = 'none'
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


function AddEventOnClick(event) {
    event.preventDefault();
    const data = {
        'name': document.getElementById('add-event-name').value,
        'description': document.getElementById('add-event-description').value,
        'date': document.getElementById('add-event-date').value,
        'password': document.getElementById('add-event-password').value,
    }

    AddNewEvent(data)
}

function EditEventOnClick(event) {
    event.preventDefault();
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
    document.getElementById('edit-event-block').style.display = 'block'

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

            // Edit button
            editButton = document.createElement('button')
            editButton.onclick = function () {
                PrepEditEventForm(event.id)
            }
            editButton.innerHTML = 'Edit'
            
            // Add Buttons to div
            actionsButtons.appendChild(archiveButton)
            actionsButtons.appendChild(editButton)
        }
        else {
            // Archive button
            activeateButton = document.createElement('button')
            activeateButton.onclick = function () {
                ActivateEvent(event.id)
            }
            activeateButton.innerHTML = 'Activate'

            // Edit button
            editButton = document.createElement('button')
            editButton.disabled = true
            editButton.innerHTML = 'Edit'
            
            // Add Buttons to div
            actionsButtons.appendChild(activeateButton)
            actionsButtons.appendChild(editButton)
        }


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
document.getElementById('add-event-form').addEventListener('submit', AddEventOnClick);
document.getElementById('edit-event-form').addEventListener('submit', EditEventOnClick);
document.getElementById('edit-event-form').addEventListener('reset', function() {
    document.getElementById('edit-event-block').style.display = 'none'
});