function GetRoles() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/roles',
            type: 'GET',
            success: function(response) {
                resolve(response.roles);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function GetRole(roleId) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/roles/' + roleId,
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

function GetPageNames(queryString=null) {
    return new Promise((resolve, reject) => {
        let url = '/backend/pages/name'
        if (queryString != null) {
            url += `?${queryString}`
        }   
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                resolve(response.pages);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function AddNewRole(data) {
    $.ajax({
        type: 'POST',
        url: '/backend/roles',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: async function(response) {
            await PopulateRolesTable();
            document.getElementById('roles-request-response').innerHTML = response.message
        }
    });
}

function EditRole(roleId, data) {
    $.ajax({
        type: 'PATCH',
        url: '/backend/roles/' + roleId,
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: async function(response) {
            await PopulateRolesTable();
            document.getElementById('roles-request-response').innerHTML = response.message
        }
    });
}

function DeleteRole(roleId) {
    $.ajax({
        type: 'DELETE',
        url: '/backend/roles/' + roleId,
        success: async function(response) {
            await PopulateRolesTable();
            document.getElementById('roles-request-response').innerHTML = response.message
        }
    });
}

function AddRoleOnClick() {
    const data = {
        'name': document.getElementById('add-role-name').value,
        'description': document.getElementById('add-role-description').value,
        'page_ids': GetSelectValues(document.getElementById('add-role-select-pages')),
    }

    AddNewRole(data)
}

function EditRoleOnClick() {
    roleId = document.getElementById('edit-role-id').value
    const data = {
        'name': document.getElementById('edit-role-name').value,
        'description': document.getElementById('edit-role-description').value,
        'page_ids': GetSelectValues(document.getElementById('edit-role-select-pages')),
    }

    EditRole(roleId, data)
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

// Empties all children from a html element
function EmptyElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

function CreateAndAppendCell(row, content) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

function BuildPageNamesQueryString(page_ids) {
    if (page_ids == null || page_ids.length <= 0) {
        page_ids = [-1]
    }
    queryString = 'id='

    for (i = 0; i < page_ids.length; i++) {
        id = page_ids[i]

        if (i == 0) {
            queryString += id
        }
        else {
            queryString += `|${id}`
        }
    }

    return queryString
}

function GetDifference(list1, list2) {
    const list2Ids = new Set(list2.map(obj => obj.id));
    return list1.filter(obj => !list2Ids.has(obj.id));
}

async function PrepAddRoleForm() {
    let allPages = await GetPageNames()

    let addRolePagesContainer = document.getElementById('add-role-pages-container')
    EmptyElement(addRolePagesContainer)

    let select = document.createElement('select')
    select.id = 'add-role-select-pages'
    select.name = 'page_ids[]'
    select.multiple = true
    select.placeholder = 'Select pages'

    // Add all pages
    for (const page of allPages) {
        let option = document.createElement('option')
        option.value = page.id
        option.text = page.name
        select.appendChild(option)
    }

    addRolePagesContainer.appendChild(select)
    
    // Create a new Tom Select instance
    new TomSelect("#add-role-select-pages", {
        plugins: ['remove_button'],
        create: false,
        maxItems: null,
    });
}

async function PrepEditRoleForm(roleId) {
    let role = await GetRole(roleId)
    let queryString = BuildPageNamesQueryString(role.page_ids)
    let selectedPages = await GetPageNames(queryString)

    let allPages = await GetPageNames()
    let otherPages = GetDifference(allPages, selectedPages)

    let editRolePagesContainer = document.getElementById('edit-role-pages-container')
    EmptyElement(editRolePagesContainer)

    document.getElementById('edit-role-id').value = role.id
    document.getElementById('edit-role-name').value = role.name
    document.getElementById('edit-role-description').innerText = role.description

    let select = document.createElement('select')
    select.id = 'edit-role-select-pages'
    select.name = 'page_ids[]'
    select.multiple = true
    select.placeholder = 'Select pages'

    // Add Selected pages
    for (const page of selectedPages) {
        let option = document.createElement('option')
        option.value = page.id
        option.text = page.name
        option.selected = true
        select.appendChild(option)
    }

    // Add all other pages
    for (const page of otherPages) {
        let option = document.createElement('option')
        option.value = page.id
        option.text = page.name
        select.appendChild(option)
    }

    editRolePagesContainer.appendChild(select)
    
    // Create a new Tom Select instance
    new TomSelect("#edit-role-select-pages", {
        plugins: ['remove_button'],
        create: false,
        maxItems: null,
    });
}

async function PopulateRolesTable() {
    let allRoles = await GetRoles();

    $('#roles-table tbody').empty();

    for (const role of allRoles) {
        let queryString = BuildPageNamesQueryString(role.page_ids)
        let pages = await GetPageNames(queryString)
        let pageNames = pages.map(page => page.name).join(', ')

        let actionsButtons = document.createElement('div')

        let deleteButton = document.createElement('button')
        deleteButton.classList.add('btn', 'btn-danger')
        deleteButton.innerHTML = 'Delete'
        if (!role.default) {
            deleteButton.onclick = function () {
                DeleteRole(role.id)
            }
        }
        else {
            deleteButton.disabled = true
        }

        
        // Edit button
        editButton = document.createElement('button')
        editButton.innerHTML = 'Edit'
        editButton.className  = 'btn btn-secondary'
        editButton.setAttribute('data-bs-toggle', 'modal');
        editButton.setAttribute('data-bs-target','#edit-role-modal')
        editButton.onclick = function() {
            PrepEditRoleForm(role.id)
        }

        actionsButtons.appendChild(editButton)
        actionsButtons.appendChild(deleteButton)


        let row = document.createElement('tr')
        CreateAndAppendCell(row, role.name)
        CreateAndAppendCell(row, role.description)
        CreateAndAppendCell(row, pageNames)
        row.appendChild(actionsButtons)

        $('#roles-table').append(row);
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", PopulateRolesTable);