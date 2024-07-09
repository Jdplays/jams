function GetUsers() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/users',
            type: 'GET',
            success: function(response) {
                resolve(response.users);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetRoleNames() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/roles/name',
            type: 'GET',
            success: function(response) {
                resolve(response.roles);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function ArchiveUser(userID) {
    $.ajax({
        type: 'POST',
        url: '/backend/users/' + userID + '/archive',
        success: async function(response) {
            await PopulateUserManagementTable();
            document.getElementById('user-request-response').innerHTML = response.message
        }
    });
}

function ActivateUser(userID) {
    $.ajax({
        type: 'POST',
        url: '/backend/users/' + userID + '/activate',
        success: async function(response) {
            await PopulateUserManagementTable();
            document.getElementById('user-request-response').innerHTML = response.message
        }
    });
}

function CreateAndAppendCell(row, content) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

async function PopulateUserManagementTable() {
    let allUsers = await GetUsers()
    let allRoles = await GetRoleNames()

    // Empty the table
    $('#users-table tbody').empty();

    for (const user of allUsers){
        var selectedRoles = user.role_ids

        actionsButton = document.createElement('button')

        if (user.active) {
            actionsButton.onclick = function () {
                ArchiveUser(user.id)
            }
            actionsButton.innerHTML = "Archive"
        }
        else {
            actionsButton.onclick = function() {
                ActivateUser(user.id)
            }
            actionsButton.innerHTML = "Activate"
        }

        var rolesDropdown = document.createElement('select');
        rolesDropdown.setAttribute('multiple', '');
        for (role of allRoles) {
            var selected = selectedRoles.includes(role.id) ? true : false;
            option = document.createElement('option')
            option.innerHTML = role.name
            option.value = role.id
            option.selected = selected
            rolesDropdown.appendChild(option)
        }

        var row = document.createElement('tr')
        CreateAndAppendCell(row, user.username)
        CreateAndAppendCell(row, user.email)
        CreateAndAppendCell(row, user.full_name)
        CreateAndAppendCell(row, user.last_login)
        row.appendChild(rolesDropdown)
        CreateAndAppendCell(row, user.active)
        row.appendChild(actionsButton)

        $('#users-table').append(row);
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", PopulateUserManagementTable);