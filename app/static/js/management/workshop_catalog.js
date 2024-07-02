function fetchDataAndPopulateWorkshopcatalogTable() {
        $.ajax({
            url: '/api/management/get_workshop_catalog_table',
            type: 'GET',
            success: function(response) {
                workshops = response.workshops;

                $('#workshop-table tbody').empty();

                workshops.forEach(function(workshop) {

                    
                    actionsButtonHtml = ''

                    if (workshop.active) {
                        actionsButtonHtml = '<button onclick="prepEditWorkshopForm(' + workshop.id + ')">Edit</button>' + 
                        '<button onclick="archiveWorkshop(' + workshop.id + ')">Archive</button>'
                    }
                    else {
                        actionsButtonHtml = '<button onclick="prepEditWorkshopForm(' + workshop.id + ')" disabled>Edit</button>' + 
                        '<button onclick="activateWorkshop(' + workshop.id + ')">Activate</button>'
                    }

                    var row = '<tr>' + 
                    '<td>' + workshop.name + '</td>' +
                    '<td>' + workshop.description + '</td>' +
                    '<td>' + workshop.min_volunteers + '</td>' +
                    '<td>' + workshop.active + '</td>' +
                    '<td>' + actionsButtonHtml + '</td>' +
                    '</tr>';

                    $('#workshop-table').append(row);
                });
            },
            error: function(error) {
                console.log('Error fetching data:', error);
            }
        });
}

function addNewWorkshopFromForm(event) {
    event.preventDefault();

    $.ajax({
        type: 'POST',
        url: '/api/management/add_workshop',
        data: $('#add-workshop-form').serialize(),
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateWorkshopcatalogTable();
            }

            document.getElementById('workshop-request-response').innerHTML = response.message
        }
    });
}

function prepEditWorkshopForm(workshopID) {
    document.getElementById('edit-workshop-block').style.display = 'block'

    $.ajax({
        url: '/api/management/get_workshop_details/' + workshopID,
        type: 'GET',
        success: function(response) {
            workshopID = response.id;
            workshopName = response.name;
            workshopDescription = response.description;
            workshopMinVolunteers = response.min_volunteers;

            document.getElementById('edit-workshop-id').value = workshopID
            document.getElementById('edit-workshop-name').value = workshopName
            document.getElementById('edit-workshop-description').innerText = workshopDescription
            document.getElementById('edit-workshop-min_volunteers').value = workshopMinVolunteers
        }
    });

}

function editWorkshopFromForm(event) {
    event.preventDefault();

    const data = {
        'workshop_id': document.getElementById('edit-workshop-id').value,
        'name': document.getElementById('edit-workshop-name').value,
        'description': document.getElementById('edit-workshop-description').value,
        'min_volunteers': document.getElementById('edit-workshop-min_volunteers').value,
    }

    $.ajax({
        type: 'POST',
        url: '/api/management/edit_workshop',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateWorkshopcatalogTable();
                document.getElementById('edit-workshop-block').style.display = 'none'
            }

            document.getElementById('workshop-request-response').innerHTML = response.message
        }
    });
}

function archiveWorkshop(workshopID) {
    const data = {
        'workshop_id': workshopID
    }
    $.ajax({
        type: 'POST',
        url: '/api/management/archive_workshop',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateWorkshopcatalogTable();
            }

            document.getElementById('workshop-request-response').innerHTML = response.message
        }
    });
}

function activateWorkshop(workshopID) {
    const data = {
        'workshop_id': workshopID
    }
    $.ajax({
        type: 'POST',
        url: '/api/management/activate_workshop',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateWorkshopcatalogTable();
            }

            document.getElementById('workshop-request-response').innerHTML = response.message
        }
    });
}

// Event listeners
document.addEventListener("DOMContentLoaded", fetchDataAndPopulateWorkshopcatalogTable);
document.getElementById('add-workshop-form').addEventListener('submit', addNewWorkshopFromForm);
document.getElementById('edit-workshop-form').addEventListener('submit', editWorkshopFromForm);
document.getElementById('edit-workshop-form').addEventListener('reset', function() {
    document.getElementById('edit-workshop-block').style.display = 'none'
});