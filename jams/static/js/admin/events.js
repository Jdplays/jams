function fetchDataAndPopulateEventsTable() {
    $.ajax({
        url: '/admin/get_events_table',
        type: 'GET',
        success: function(response) {
            events = response.events;

            $('#events-table tbody').empty();

            events.forEach(function(event) {
                
                actionsButtonHtml = ''

                if (event.active) {
                    actionsButtonHtml = '<button onclick="prepEditEventForm(' + event.id + ')">Edit</button>' + 
                    '<button onclick="archiveEvent(' + event.id + ')">Archive</button>'
                }
                else {
                    actionsButtonHtml = '<button onclick="prepEditEventForm(' + event.id + ')" disabled>Edit</button>' + 
                    '<button onclick="activateEvent(' + event.id + ')">Activate</button>'
                }


                var row = '<tr>' + 
                '<td>' + event.name + '</td>' +
                '<td>' + event.description + '</td>' +
                '<td>' + event.date + '</td>' +
                '<td>' + event.password + '</td>' +
                '<td>' + actionsButtonHtml + '</td>' +
                '</tr>';

                $('#events-table').append(row);
            });
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function addNewEventFromForm(event) {
event.preventDefault();

$.ajax({
    type: 'POST',
    url: '/admin/add_event',
    data: $('#add-event-form').serialize(),
    success: function(response) {
        if (response.status === 'success') {
            fetchDataAndPopulateEventsTable();
        }

        document.getElementById('events-request-response').innerHTML = response.message
    }
});
}

function prepEditEventForm(eventID) {
document.getElementById('edit-event-block').style.display = 'block'

$.ajax({
    url: '/admin/get_event_details/' + eventID,
    type: 'GET',
    success: function(response) {
        eventID = response.id;
        eventName = response.name;
        eventDescription = response.description;
        eventDate = response.date;
        eventPassword = response.password;

        document.getElementById('edit-event-id').value = eventID
        document.getElementById('edit-event-name').value = eventName
        document.getElementById('edit-event-description').innerText = eventDescription
        document.getElementById('edit-event-date').value = eventDate
        document.getElementById('edit-event-password').value = eventPassword
    }
});

}

function editEventFromForm(event) {
event.preventDefault();

const data = {
    'event_id': document.getElementById('edit-event-id').value,
    'name': document.getElementById('edit-event-name').value,
    'description': document.getElementById('edit-event-description').value,
    'date': document.getElementById('edit-event-date').value,
    'password': document.getElementById('edit-event-password').value,
}

$.ajax({
    type: 'POST',
    url: '/admin/edit_event',
    data: JSON.stringify(data),
    contentType: 'application/json',
    success: function(response) {
        if (response.status === 'success') {
            fetchDataAndPopulateEventsTable();
            document.getElementById('edit-event-block').style.display = 'none'
        }

        document.getElementById('events-request-response').innerHTML = response.message
    }
});
}

function archiveEvent(eventID) {
const data = {
    'event_id': eventID
}
$.ajax({
    type: 'POST',
    url: '/admin/archive_event',
    data: JSON.stringify(data),
    contentType: 'application/json',
    success: function(response) {
        if (response.status === 'success') {
            fetchDataAndPopulateEventsTable();
        }

        document.getElementById('events-request-response').innerHTML = response.message
    }
});
}

function activateEvent(eventID) {
const data = {
    'event_id': eventID
}
$.ajax({
    type: 'POST',
    url: '/admin/activate_event',
    data: JSON.stringify(data),
    contentType: 'application/json',
    success: function(response) {
        if (response.status === 'success') {
            fetchDataAndPopulateEventsTable();
        }

        document.getElementById('events-request-response').innerHTML = response.message
    }
});
}

// Event listeners
document.addEventListener("DOMContentLoaded", fetchDataAndPopulateEventsTable);
document.getElementById('add-event-form').addEventListener('submit', addNewEventFromForm);
document.getElementById('edit-event-form').addEventListener('submit', editEventFromForm);
document.getElementById('edit-event-form').addEventListener('reset', function() {
document.getElementById('edit-event-block').style.display = 'none'
});