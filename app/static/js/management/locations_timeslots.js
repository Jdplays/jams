function fetchDataAndPopulateLocationsTable() {
    $.ajax({
        url: '/api/management/get_locations_table',
        type: 'GET',
        success: function(response) {
            locations = response.locations;

            $('#location-table tbody').empty();

            locations.forEach(function(location) {

                
                actionsButtonHtml = ''

                if (location.active) {
                    actionsButtonHtml = '<button onclick="prepEditLocationForm(' + location.id + ')">Edit</button>' + 
                    '<button onclick="archiveLocation(' + location.id + ')">Archive</button>'
                }
                else {
                    actionsButtonHtml = '<button onclick="prepEditLocationForm(' + location.id + ')" disabled>Edit</button>' + 
                    '<button onclick="activateLocation(' + location.id + ')">Activate</button>'
                }

                var row = '<tr>' + 
                '<td>' + location.name + '</td>' +
                '<td>' + actionsButtonHtml + '</td>' +
                '</tr>';

                $('#location-table').append(row);
            });
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function addNewLocationFromForm(event) {
    event.preventDefault();

    $.ajax({
        type: 'POST',
        url: '/api/management/add_location',
        data: $('#add-location-form').serialize(),
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateLocationsTable();
            }

            document.getElementById('location-request-response').innerHTML = response.message
        }
    });
}

function prepEditLocationForm(locationID) {
    document.getElementById('edit-location-block').style.display = 'block'

    $.ajax({
        url: '/api/management/get_location_details/' + locationID,
        type: 'GET',
        success: function(response) {
            locationID = response.id;
            locationName = response.name;

            document.getElementById('edit-location-id').value = locationID
            document.getElementById('edit-location-name').value = locationName
        }
    });

}

function editLocationFromForm(event) {
    event.preventDefault();

    const data = {
        'location_id': document.getElementById('edit-location-id').value,
        'name': document.getElementById('edit-location-name').value,
    }

    $.ajax({
        type: 'POST',
        url: '/api/management/edit_location',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateLocationsTable();
                document.getElementById('edit-location-block').style.display = 'none'
            }

            document.getElementById('location-request-response').innerHTML = response.message
        }
    });
}

function archiveLocation(locationID) {
    const data = {
        'location_id': locationID
    }
    $.ajax({
        type: 'POST',
        url: '/api/management/archive_location',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateLocationsTable();
            }

            document.getElementById('location-request-response').innerHTML = response.message
        }
    });
}

function activateLocation(locationID) {
    const data = {
        'location_id': locationID
    }
    $.ajax({
        type: 'POST',
        url: '/api/management/activate_location',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateLocationsTable();
            }

            document.getElementById('location-request-response').innerHTML = response.message
        }
    });
}

// Event listeners
document.addEventListener("DOMContentLoaded", fetchDataAndPopulateLocationsTable);
document.getElementById('add-location-form').addEventListener('submit', addNewLocationFromForm);
document.getElementById('edit-location-form').addEventListener('submit', editLocationFromForm);
document.getElementById('edit-location-form').addEventListener('reset', function() {
    document.getElementById('edit-location-block').style.display = 'none'
});



function fetchDataAndPopulateTimeslotsTable() {
    $.ajax({
        url: '/api/management/get_timeslots_table',
        type: 'GET',
        success: function(response) {
            timeslots = response.timeslots;

            $('#timeslot-table tbody').empty();

            timeslots.forEach(function(timeslot) {

                
                actionsButtonHtml = ''

                if (timeslot.active) {
                    actionsButtonHtml = '<button onclick="prepEditTimeslotForm(' + timeslot.id + ')">Edit</button>' + 
                    '<button onclick="archiveTimeslot(' + timeslot.id + ')">Archive</button>'
                }
                else {
                    actionsButtonHtml = '<button onclick="prepEditTimeslotForm(' + timeslot.id + ')" disabled>Edit</button>' + 
                    '<button onclick="activateTimeslot(' + timeslot.id + ')">Activate</button>'
                }

                var row = '<tr>' + 
                '<td>' + timeslot.name + '</td>' +
                '<td>' + timeslot.start + '</td>' +
                '<td>' + timeslot.end + '</td>' +
                '<td>' + actionsButtonHtml + '</td>' +
                '</tr>';

                $('#timeslot-table').append(row);
            });
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function addNewTimeslotFromForm(event) {
    event.preventDefault();

    $.ajax({
        type: 'POST',
        url: '/api/management/add_timeslot',
        data: $('#add-timeslot-form').serialize(),
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateTimeslotsTable();
            }

            document.getElementById('timeslot-request-response').innerHTML = response.message
        }
    });
}

function prepEditTimeslotForm(timeslotID) {
    document.getElementById('edit-timeslot-block').style.display = 'block'

    $.ajax({
        url: '/api/management/get_timeslot_details/' + timeslotID,
        type: 'GET',
        success: function(response) {
            timeslotID = response.id;
            timeslotName = response.name;
            timeslotStart = response.start
            timeslotEnd = response.end

            document.getElementById('edit-timeslot-id').value = timeslotID
            document.getElementById('edit-timeslot-name').value = timeslotName
            document.getElementById('edit-timeslot-start-time').value = timeslotStart
            document.getElementById('edit-timeslot-end-time').value = timeslotEnd
        }
    });

}

function editTimeslotFromForm(event) {
    event.preventDefault();

    const data = {
        'timeslot_id': document.getElementById('edit-timeslot-id').value,
        'name': document.getElementById('edit-timeslot-name').value,
        'start_time': document.getElementById('edit-timeslot-start-time').value,
        'end_time': document.getElementById('edit-timeslot-end-time').value
    }

    $.ajax({
        type: 'POST',
        url: '/api/management/edit_timeslot',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateTimeslotsTable();
                document.getElementById('edit-timeslot-block').style.display = 'none'
            }

            document.getElementById('timeslot-request-response').innerHTML = response.message
        }
    });
}

function archiveTimeslot(timeslotID) {
    const data = {
        'timeslot_id': timeslotID
    }
    $.ajax({
        type: 'POST',
        url: '/api/management/archive_timeslot',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateTimeslotsTable();
            }

            document.getElementById('timeslot-request-response').innerHTML = response.message
        }
    });
}

function activateTimeslot(timeslotID) {
    const data = {
        'timeslot_id': timeslotID
    }
    $.ajax({
        type: 'POST',
        url: '/api/management/activate_timeslot',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateTimeslotsTable();
            }

            document.getElementById('timeslot-request-response').innerHTML = response.message
        }
    });
}

// Event listeners
document.addEventListener("DOMContentLoaded", fetchDataAndPopulateTimeslotsTable);
document.getElementById('add-timeslot-form').addEventListener('submit', addNewTimeslotFromForm);
document.getElementById('edit-timeslot-form').addEventListener('submit', editTimeslotFromForm);
document.getElementById('edit-timeslot-form').addEventListener('reset', function() {
    document.getElementById('edit-timeslot-block').style.display = 'none'
});