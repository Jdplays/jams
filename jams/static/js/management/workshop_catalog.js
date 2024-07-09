function GetWorkshops() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/workshops',
            type: 'GET',
            success: function(response) {
                resolve(response.workshops);  
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetWorkshop(workshopID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/workshops/' + workshopID,
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

function AddWorkshop(data) {
    $.ajax({
        type: 'POST',
        url: '/backend/workshops',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            PopulateWorkshopsTable();
            document.getElementById('workshop-request-response').innerHTML = response.message
        }
    });
}

function EditWorkshop(workshopID, data) {
    $.ajax({
        type: 'PATCH',
        url: '/backend/workshops/' + workshopID,
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            PopulateWorkshopsTable();
            document.getElementById('edit-workshop-block').style.display = 'none'
            document.getElementById('workshop-request-response').innerHTML = response.message
        }
    });
}


function ArchiveWorkshop(workshopID) {
    $.ajax({
        type: 'POST',
        url: '/backend/workshops/' + workshopID + '/archive',
        success: function(response) {
            PopulateWorkshopsTable();
            document.getElementById('workshop-request-response').innerHTML = response.message
        }
    });
}

function ActivateWorkshop(workshopID) {
    $.ajax({
        type: 'POST',
        url: '/backend/workshops/' + workshopID + '/activate',
        success: function(response) {
            PopulateWorkshopsTable();
            document.getElementById('workshop-request-response').innerHTML = response.message
        }
    });
}

function AddWorkshopOnClick(event) {
    event.preventDefault();
    const data = {
        'name': document.getElementById('add-workshop-name').value,
        'description': document.getElementById('add-workshop-description').value,
        'min_volunteers': document.getElementById('add-workshop-min_volunteers').value,
    }

    AddWorkshop(data)
}

function EditWorkshopOnClick(event) {
    event.preventDefault();
    workshopID = document.getElementById('edit-workshop-id').value
    const data = {
        'name': document.getElementById('edit-workshop-name').value,
        'description': document.getElementById('edit-workshop-description').value,
        'min_volunteers': document.getElementById('edit-workshop-min_volunteers').value,
    }

    EditWorkshop(workshopID, data)
}


async function prepEditWorkshopForm(workshopID) {
    let workshop = await GetWorkshop(workshopID)
    document.getElementById('edit-workshop-block').style.display = 'block'

    document.getElementById('edit-workshop-id').value = workshop.id
    document.getElementById('edit-workshop-name').value = workshop.name
    document.getElementById('edit-workshop-description').innerText = workshop.description
    document.getElementById('edit-workshop-min_volunteers').value = workshop.min_volunteers

}

function CreateAndAppendCell(row, content) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

async function PopulateWorkshopsTable() {
    let allWorkshops = await GetWorkshops();

    $('#workshop-table tbody').empty();

    for (const workshop of allWorkshops) {

        actionsButtons = document.createElement('div')

        if (workshop.active) {
            // Archive button
            archiveButton = document.createElement('button')
            archiveButton.onclick = function () {
                ArchiveWorkshop(workshop.id)
            }
            archiveButton.innerHTML = 'Archive'

            // Edit button
            editButton = document.createElement('button')
            editButton.onclick = function () {
                prepEditWorkshopForm(workshop.id)
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
                ActivateWorkshop(workshop.id)
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
        CreateAndAppendCell(row, workshop.name)
        CreateAndAppendCell(row, workshop.description)
        CreateAndAppendCell(row, workshop.min_volunteers)
        CreateAndAppendCell(row, workshop.active)
        row.appendChild(actionsButtons)

        $('#workshop-table').append(row);
    };
}

// Event listeners
document.addEventListener("DOMContentLoaded", PopulateWorkshopsTable);
document.getElementById('add-workshop-form').addEventListener('submit', AddWorkshopOnClick);
document.getElementById('edit-workshop-form').addEventListener('submit', EditWorkshopOnClick);
document.getElementById('edit-workshop-form').addEventListener('reset', function() {
    document.getElementById('edit-workshop-block').style.display = 'none'
});