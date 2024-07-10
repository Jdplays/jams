function GetLocations() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/locations',
            type: 'GET',
            success: function(response) {
                resolve(response.locations);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetLocation(locationID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/locations/' + locationID,
            type: 'GET',
            success: function(response) {
                resolve(response);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function AddLocation(data) {
    $.ajax({
        type: 'POST',
        url: '/backend/locations',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            PopulateLocationsTable();
            document.getElementById('location-request-response').innerHTML = response.message
        }
    });
}

function EditLocation(locationID, data) {
    $.ajax({
        type: 'PATCH',
        url: '/backend/locations/' + locationID,
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            PopulateLocationsTable();
            document.getElementById('location-request-response').innerHTML = response.message
        }
    });
}

function ArchiveLocation(locationID) {
    $.ajax({
        type: 'POST',
        url: '/backend/locations/' + locationID + '/archive',
        success: function(response) {
            PopulateLocationsTable();
            document.getElementById('location-request-response').innerHTML = response.message
        }
    });
}

function ActivateLocation(locationID) {
    $.ajax({
        type: 'POST',
        url: '/backend/locations/' + locationID + '/activate',
        success: function(response) {
            PopulateLocationsTable();
            document.getElementById('location-request-response').innerHTML = response.message
        }
    });
}

function AddLocationOnClick() {
    const data = {
        'name': document.getElementById('add-location-name').value,
    }

    AddLocation(data)
}

function EditLocationOnClick() {
    locationID = document.getElementById('edit-location-id').value
    const data = {
        'name': document.getElementById('edit-location-name').value,
    }

    EditLocation(locationID, data)
}

async function prepEditLocationForm(locationID) {
    let location = await GetLocation(locationID)

    document.getElementById('edit-location-id').value = location.id
    document.getElementById('edit-location-name').value = location.name
}

function CreateAndAppendCell(row, content) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

async function PopulateLocationsTable() {
    let allLocations = await GetLocations()

    $('#location-table tbody').empty();

    for (const location of allLocations) {

        
        actionsButtons = document.createElement('div')

        if (location.active) {
            // Archive button
            archiveButton = document.createElement('button')
            archiveButton.onclick = function () {
                ArchiveLocation(location.id)
            }
            archiveButton.innerHTML = 'Archive'
            archiveButton.className  = 'btn btn-danger'
            
            // Add Button to div
            actionsButtons.appendChild(archiveButton)
        }
        else {
            // Activate button
            activeateButton = document.createElement('button')
            activeateButton.onclick = function () {
                ActivateLocation(location.id)
            }
            activeateButton.innerHTML = 'Activate'
            activeateButton.className  = 'btn btn-success'
            
            // Add Button to div
            actionsButtons.appendChild(activeateButton)
        }

        // Edit button
        editButton = document.createElement('button')
        editButton.onclick = function () {
            prepEditLocationForm(location.id)
        }
        editButton.innerHTML = 'Edit'
        editButton.className  = 'btn btn-secondary'
        editButton.setAttribute('data-bs-toggle', 'modal');
        editButton.setAttribute('data-bs-target','#edit-location-modal')
        editButton.disabled = !location.active

        actionsButtons.appendChild(editButton)

        var row = document.createElement('tr')
        CreateAndAppendCell(row, location.name)
        row.appendChild(actionsButtons)

        $('#location-table').append(row);
    };
}

// Event listeners
document.addEventListener("DOMContentLoaded", PopulateLocationsTable);



function GetTimeslots() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/timeslots',
            type: 'GET',
            success: function(response) {
                resolve(response.timeslots);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetTimeslot(timeslotID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/timeslots/' + timeslotID,
            type: 'GET',
            success: function(response) {
                resolve(response);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function AddTimeslot(data) {
    $.ajax({
        type: 'POST',
        url: '/backend/timeslots',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            PopulateTimeslotsTable();
            document.getElementById('timeslot-request-response').innerHTML = response.message
        }
    });
}

function EditTimeslot(timeslotID, data) {
    $.ajax({
        type: 'PATCH',
        url: '/backend/timeslots/' + timeslotID,
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            PopulateTimeslotsTable();
            document.getElementById('timeslot-request-response').innerHTML = response.message
        }
    });
}

function ArchiveTimeslot(timeslotID) {
    $.ajax({
        type: 'POST',
        url: '/backend/timeslots/' + timeslotID + '/archive',
        success: function(response) {
            PopulateTimeslotsTable();
            document.getElementById('timeslot-request-response').innerHTML = response.message
        }
    });
}

function ActivateTimeslot(timeslotID) {
    $.ajax({
        type: 'POST',
        url: '/backend/timeslots/' + timeslotID + '/activate',
        success: function(response) {
            PopulateTimeslotsTable();
            document.getElementById('timeslot-request-response').innerHTML = response.message
        }
    });
}

function AddTimeslotOnClick() {
    const data = {
        'name': document.getElementById('add-timeslot-name').value,
        'start': document.getElementById('add-timeslot-start-time').value,
        'end': document.getElementById('add-timeslot-end-time').value
    }

    AddTimeslot(data)
}

function EditTimeslotOnClick() {
    timeslotID = document.getElementById('edit-timeslot-id').value
    const data = {
        'name': document.getElementById('edit-timeslot-name').value,
        'start': document.getElementById('edit-timeslot-start-time').value,
        'end': document.getElementById('edit-timeslot-end-time').value
    }

    EditTimeslot(timeslotID, data)
}

async function prepEditTimeslotForm(timeslotID) {
    let timeslot = await GetTimeslot(timeslotID)

    document.getElementById('edit-timeslot-id').value = timeslot.id
    document.getElementById('edit-timeslot-name').value = timeslot.name
    document.getElementById('edit-timeslot-start-time').value = timeslot.start
    document.getElementById('edit-timeslot-end-time').value = timeslot.end
}

function CreateAndAppendCell(row, content) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

async function PopulateTimeslotsTable() {
    let allTimeslots = await GetTimeslots()

    $('#timeslot-table tbody').empty();

    for (const timeslot of allTimeslots) {

        
        actionsButtons = document.createElement('div')

        if (timeslot.active) {
            // Archive button
            archiveButton = document.createElement('button')
            archiveButton.onclick = function () {
                ArchiveTimeslot(timeslot.id)
            }
            archiveButton.innerHTML = 'Archive'
            archiveButton.className  = 'btn btn-danger'

            // Add Button to div
            actionsButtons.appendChild(archiveButton)
        }
        else {
            // Activate button
            activeateButton = document.createElement('button')
            activeateButton.onclick = function () {
                ActivateTimeslot(timeslot.id)
            }
            activeateButton.innerHTML = 'Activate'
            activeateButton.className  = 'btn btn-success'
            
            // Add Buttons to div
            actionsButtons.appendChild(activeateButton)
            
        }

        // Edit button
        editButton = document.createElement('button')
        editButton.onclick = function () {
            prepEditTimeslotForm(timeslot.id)
        }
        editButton.disabled = !timeslot.active
        editButton.innerHTML = 'Edit'
        editButton.className  = 'btn btn-secondary'
        editButton.setAttribute('data-bs-toggle', 'modal');
        editButton.setAttribute('data-bs-target','#edit-timeslot-modal')

        actionsButtons.appendChild(editButton)

        var row = document.createElement('tr')
        CreateAndAppendCell(row, timeslot.name)
        CreateAndAppendCell(row, timeslot.start)
        CreateAndAppendCell(row, timeslot.end)
        row.appendChild(actionsButtons)

        $('#timeslot-table').append(row);
    };
}



// Event listeners
document.addEventListener("DOMContentLoaded", PopulateTimeslotsTable);