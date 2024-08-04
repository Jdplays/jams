import {Toast} from "../global/sweet_alert.js"

let gridApi;

let roleNamesMap = {};
let currentUserId;

function getCurrentUser() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/get_current_user_id',
            type: 'GET',
            success: function(response) {
                resolve(response.current_user_id);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function getUsers() {
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

function getUserRoles(userId) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/users/${userId}/role_ids`,
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

function editUser(userId, data) {
    $.ajax({
        type: 'PATCH',
        url: '/backend/users/' + userId,
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: async function(response) {
            await populateUserManagementTable();
            Toast.fire({
                icon: 'success',
                title: response.message
            })
        },
        error: function(error) {
            console.log(error)
            Toast.fire({
                icon: 'error',
                title: 'An Error occurred!'
            })
        }
    });
}

function getRoleNames(queryString=null) {
    return new Promise((resolve, reject) => {
        let url = '/backend/roles/name'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

function archiveUser(userID) {
    $.ajax({
        type: 'POST',
        url: '/backend/users/' + userID + '/archive',
        success: async function(response) {
            await populateUserManagementTable();
            Toast.fire({
                icon: 'success',
                title: response.message
            })
        },
        error: function(error) {
            console.log(error)
            Toast.fire({
                icon: 'error',
                title: 'An Error occurred!'
            })
        }
    });
}

function activateUser(userID) {
    $.ajax({
        type: 'POST',
        url: '/backend/users/' + userID + '/activate',
        success: async function(response) {
            await populateUserManagementTable();
            Toast.fire({
                icon: 'success',
                title: response.message
            })
        },
        error: function(error) {
            console.log(error)
            Toast.fire({
                icon: 'error',
                title: 'An Error occurred!'
            })
        }
    });
}

function GetSelectValues(select) {
    var result = [];
    var options = select && select.options;
    var opt;
  
    for (var i=0, iLen=options.length; i<iLen; i++) {
      opt = options[i];
  
      if (opt.selected) {
        result.push(Number(opt.value));
      }
    }
    return result;
  }

function EmptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

function editUserOnClick() {
    userId = document.getElementById('edit-user-id').value

    const data = {
        'role_ids': GetSelectValues(document.getElementById('edit-user-select-roles'))
    }

    editUser(userId, data)
}

async function prepEditUserForm(userId) {
    document.getElementById('edit-user-id').value = userId
    let userRoles = await getUserRoles(userId)

    let editUserRolesContainer = document.getElementById('edit-user-roles-container')
    EmptyElement(editUserRolesContainer)

    let select = document.createElement('select')
    select.id = 'edit-user-select-roles'
    select.name = 'role_ids[]'
    select.multiple = true
    select.placeholder = 'Select Roles'

    for (const [id, name] of Object.entries(roleNamesMap)) {
        let option = document.createElement('option')
        option.value = id
        option.text = name
        option.selected = (userRoles.role_ids.includes(parseInt(id)))
        select.appendChild(option)
    }

    editUserRolesContainer.appendChild(select)

    // Create a new Tom Select instance
    new TomSelect("#edit-user-select-roles", {
        plugins: ['remove_button'],
        create: false,
        maxItems: null,
    });
}

function buildEditButtonForUser(userId, isCurrentUser) {
    let button = document.createElement('button')
    button.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
    button.innerHTML = 'Edit'
    button.disabled = isCurrentUser
    button.setAttribute('data-bs-toggle', 'modal')
    button.setAttribute('data-bs-target', '#edit-user-modal')
    button.onclick = function () {
        prepEditUserForm(userId)
    }
    button.style.padding = '10px'

    return button
}

function buildActionsButtonsForUser(userId, userActive) {
    let isCurrentUser = currentUserId === userId
    let container = document.createElement('div')
    if (userActive) {
        container.appendChild(buildEditButtonForUser(userId, isCurrentUser))

        let archiveButton = document.createElement('button')
        archiveButton.classList.add('btn', 'btn-danger', 'py-1', 'px-2', 'mb-1')
        archiveButton.innerHTML = 'Archive'
        archiveButton.disabled = isCurrentUser
        archiveButton.onclick = function () {
            archiveUser(userId)
        }
        archiveButton.style.padding = '10px'
        container.appendChild(archiveButton)
    } else {
        let activateButton = document.createElement('button')
        activateButton.classList.add('btn', 'btn-success', 'py-1', 'px-2', 'mb-1')
        activateButton.innerHTML = 'Activate'
        activateButton.disabled = isCurrentUser
        activateButton.onclick = function () {
            activateUser(userId)
        }
        activateButton.style.padding = '10px'
        container.appendChild(activateButton)
    }

    return container
}

function initialiseAgGrid() {
    const gridOptions = {
        columnDefs: [
            {field: 'username', flex: 1},
            {field: 'email', flex: 1},
            {field: 'display_name', headerName: "Display Name", flex: 1},
            {
                field: 'last_login',
                headerName: "Last Login",
                flex: 1,
                valueFormatter: (params) => {
                    if (!params.data.last_login) {
                        return 'Never logged in'
                    }
                }
            },
            {field: 'roles', flex: 1},
            {
                field: 'options', cellRenderer: (params) => {
                    return buildActionsButtonsForUser(params.data.id, params.data.active)
                },
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('user-management-data-grid')
    gridApi = agGrid.createGrid(gridElement, gridOptions)
}

async function preloadRoleNames() {
    let roles = await getRoleNames();
    let roleNamesMap = {};
    roles.forEach(role => {
        roleNamesMap[role.id] = role.name;
    });
    return roleNamesMap;
}

async function populateUserManagementTable() {
    let allUsers = await getUsers()
    roleNamesMap = await preloadRoleNames()

    // Preload all the roles for each user
    for (const user of allUsers) {
        if (!user.role_ids || user.role_ids.length <= 0) {
            user.roles = 'No Role'
        } else {
            user.roles = user.role_ids.map(id => roleNamesMap[id] || 'Unknown Role').join(', ');
        }
    }
    gridApi.setGridOption('rowData', allUsers)
}

// Event listeners
document.addEventListener("DOMContentLoaded", populateUserManagementTable);
document.addEventListener("DOMContentLoaded", initialiseAgGrid);
document.addEventListener("DOMContentLoaded", async function () {
    currentUserId = await getCurrentUser()
});