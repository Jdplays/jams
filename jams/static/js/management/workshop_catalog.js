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

function GetDifficultyLevels() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/difficulty_levels',
            type: 'GET',
            success: function(response) {
                resolve(response.difficulty_levels);  
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetDifficultyLevel(difficultyLevelID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/difficulty_levels/' + difficultyLevelID,
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
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: '/backend/workshops',
            data: JSON.stringify(data),
            contentType: 'application/json',
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

function EditWorkshop(workshopID, data) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'PATCH',
            url: '/backend/workshops/' + workshopID,
            data: JSON.stringify(data),
            contentType: 'application/json',
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

function GetFileForWorkshop(workshopId) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url: '/backend/workshops/' + workshopId + '/file',
            success: function(response) {
                resolve(response.file);   
            },
            error: function(error) {
                if (error.status === 404) {
                    resolve(null);
                } else {
                    console.log('Error fetching data:', error);
                    reject(error);
                }
            }
        });
    });
}

function UploadFileToWorkshop(workshopId, fileData) {
    $.ajax({
        type: 'POST',
        url: '/backend/workshops/' + workshopId + '/file',
        data: fileData,
        processData: false,
        contentType: false,
        success: function(response) {
        }
    });
}

function AddWorkshopOnClick() {
    worksheet = document.getElementById('add-workshop-worksheet').files[0]
    const data = {
        'name': document.getElementById('add-workshop-name').value,
        'description': document.getElementById('add-workshop-description').value,
        'min_volunteers': document.getElementById('add-workshop-min_volunteers').value,
        'difficulty_id': document.getElementById('add-workshop-difficulty').value
    }
    console.log(document.getElementById('add-workshop-difficulty').value)

    AddWorkshop(data).then(response => {
        workshopId = response.workshop.id
        if (worksheet != null) {
            const originalExtension = worksheet.name.split('.').pop();
            // Define the new name for the file
            const newFileName = `worksheet.${originalExtension}`;
            const newFile = new File([worksheet], newFileName, { type: worksheet.type })
            var fileData = new FormData();
            fileData.append('file', newFile);
            UploadFileToWorkshop(workshopId, fileData)
            PopulateWorkshopsTable()
        }
    });
}

function EditWorkshopOnClick() {
    workshopID = document.getElementById('edit-workshop-id').value
    worksheet = document.getElementById('edit-workshop-worksheet').files[0]

    const data = {
        'name': document.getElementById('edit-workshop-name').value,
        'description': document.getElementById('edit-workshop-description').value,
        'min_volunteers': document.getElementById('edit-workshop-min_volunteers').value,
        'difficulty_id': document.getElementById('edit-workshop-difficulty').value
    }

    EditWorkshop(workshopID, data).then(response => {
        if (worksheet != null) {
            const originalExtension = worksheet.name.split('.').pop();
            // Define the new name for the file
            const newFileName = `worksheet.${originalExtension}`;
            const newFile = new File([worksheet], newFileName, { type: worksheet.type })
            var fileData = new FormData();
            fileData.append('file', newFile);
            UploadFileToWorkshop(workshopID, fileData)
            PopulateWorkshopsTable()
        }
    })
}

function ClearDropDown(select) {
    while(select.firstChild) {
        select.removeChild(select.firstChild)
    }
}

async function PrepAddWorkshopForm() {
    let difficultyLevels = await GetDifficultyLevels()

    const difficultyLevelDropdown = document.getElementById('add-workshop-difficulty')
    ClearDropDown(difficultyLevelDropdown)

    const defaultOptionsElement = document.createElement('option');
    defaultOptionsElement.text = "Select Difficulty"
    defaultOptionsElement.value = '-1'
    defaultOptionsElement.disabled = true;
    defaultOptionsElement.selected = true;
    defaultOptionsElement.hidden = true;
    difficultyLevelDropdown.appendChild(defaultOptionsElement)

    for (const difficulty of difficultyLevels) {
        const option = document.createElement('option');
        option.innerText = difficulty.name;
        option.value = difficulty.id

        const badge = document.createElement('span');
        badge.classList.add('badge-circle', 'ms-auto');
        badge.style.backgroundColor = difficulty.display_colour;

        difficultyLevelDropdown.appendChild(option);
    }
}


async function prepEditWorkshopForm(workshopID) {
    let workshop = await GetWorkshop(workshopID)
    let workshopDifficulty = null
    if (workshop.difficulty_id != null) {
         workshopDifficulty = await GetDifficultyLevel(workshop.difficulty_id)
    }
    let difficultyLevels = await GetDifficultyLevels()

    let workshopFile = await GetFileForWorkshop(workshop.id)

    document.getElementById('edit-workshop-id').value = workshop.id
    document.getElementById('edit-workshop-name').value = workshop.name
    document.getElementById('edit-workshop-description').innerText = workshop.description
    document.getElementById('edit-workshop-min_volunteers').value = workshop.min_volunteers

    if (workshopFile != null) {
        document.getElementById('edit-workshop-current-file').innerHTML = `Current File: ${workshopFile.name}`
    }

    const difficultyLevelDropdown = document.getElementById('edit-workshop-difficulty')
    ClearDropDown(difficultyLevelDropdown)

    const defaultOptionsElement = document.createElement('option');
    if (await workshopDifficulty == null) {
        defaultOptionsElement.text = "Select Difficulty"
        defaultOptionsElement.value = '-1'
    }
    else {
        defaultOptionsElement.innerText = workshopDifficulty.name
        defaultOptionsElement.value = workshopDifficulty.id
    }
    defaultOptionsElement.disabled = true;
    defaultOptionsElement.selected = true;
    defaultOptionsElement.hidden = true;
    difficultyLevelDropdown.appendChild(defaultOptionsElement)

    for (const difficulty of difficultyLevels) {
        const option = document.createElement('option');
        option.innerText = difficulty.name;
        option.value = difficulty.id

        const badge = document.createElement('span');
        badge.classList.add('badge-circle', 'ms-auto');
        badge.style.backgroundColor = difficulty.display_colour;

        //dropdownItem.appendChild(badge);
        difficultyLevelDropdown.appendChild(option);
    }

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

        let workshopFile = await GetFileForWorkshop(workshop.id)

        console.log(workshopFile)
        let fileLink = document.createElement('a')
        if (workshopFile != null) {
            fileLink.innerHTML = workshopFile.name
            fileLink.href = `/resources/${workshopFile.id}`
        } else {
            fileLink.innerHTML = 'No File'
        }
        fileLink.style.padding = '5px'

        actionsButtons = document.createElement('div')
        actionsButtons.className = 'btn-list'

        if (workshop.active) {
            // Archive button
            archiveButton = document.createElement('button')
            archiveButton.onclick = function () {
                ArchiveWorkshop(workshop.id)
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
                ActivateWorkshop(workshop.id)
            }
            activeateButton.innerHTML = 'Activate'
            activeateButton.className  = 'btn btn-success'
            
            // Add Button to div
            actionsButtons.appendChild(activeateButton)
            
        }

        // Edit button
        editButton = document.createElement('button')
        editButton.disabled = !workshop.active
        editButton.innerHTML = 'Edit'
        editButton.className  = 'btn btn-secondary'
        editButton.setAttribute('data-bs-toggle', 'modal');
        editButton.setAttribute('data-bs-target','#edit-workshop-modal')
        editButton.onclick = function() {
            prepEditWorkshopForm(workshop.id)
        }
        // Add Button to div
        actionsButtons.appendChild(editButton)

        // Populate difficulty level
        difficultyLevelCell = document.createElement('td')
        difficultyLevelText = document.createElement('p')
        if (workshop.difficulty_id != null) {
            let level = await GetDifficultyLevel(workshop.difficulty_id)
            difficultyLevelText.innerHTML = level.name + ' '

            badge = document.createElement('span')
            badge.className = 'badge ms-auto'
            badge.style.backgroundColor = level.display_colour

            difficultyLevelText.appendChild(badge)
        }
        else {
            difficultyLevelText.innerHTML = "None"
        }

        difficultyLevelCell.appendChild(difficultyLevelText)

        var row = document.createElement('tr')
        CreateAndAppendCell(row, workshop.name)
        CreateAndAppendCell(row, workshop.description)
        CreateAndAppendCell(row, workshop.min_volunteers)
        row.appendChild(difficultyLevelCell)
        row.appendChild(fileLink)
        CreateAndAppendCell(row, workshop.active)
        row.appendChild(actionsButtons)

        $('#workshop-table').append(row);
    };
}

function InitaliseAddForm() {
    button = document.getElementById('open-add-workshop-modal-button')
    button.onclick = function() {
        PrepAddWorkshopForm()
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", PopulateWorkshopsTable);
document.addEventListener("DOMContentLoaded", InitaliseAddForm);
  