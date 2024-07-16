const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 25000,
  timerProgressBar: false,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
  icon: undefined,
  showClass :{
    popup: '',
    backdrop: '',
    icon: ''
  },
  customClass: {
    title: "m-0"
  }
});

let editUserModal;
let gridApi;
let gridElement;

function ShowEditUserModal(userId) 
{
    editUserModal.show();
}

function GetEditButtonForUser(userId)
{
    return `<a class="btn btn-outline-primary py-1 px-2 mb-1 ms-1" onclick="ShowEditUserModal(${userId})">Edit</a>`;
}

function GetArchiveOrActiveButtonForUser(isUserActivated, userId) 
{
    if (isUserActivated) 
    {
        return `<a class="btn btn-outline-danger py-1 px-2 mb-1" onclick="ArchiveUser(${userId})">Archive</a>`;
    }
    return `<a class="btn btn-outline-secondary py-1 px-2 mb-1" onclick="ActivateUser(${userId})">Activate</a>`;
}

let gridoptions = {
  columndefs: [
    { field: "active", width: 100, sort: 'desc'},
    { field: "display_name", flex: 1, headername: "display name", minwidth: 150 },
    { field: "email", flex: 1, minwidth: 150},
    { 
      field: "last_login", 
      headername: "last login", 
      width: 250, 
      filter: true, 
      valueformatter: (params) => 
      {
          if (!params.data.last_login) 
          { 
              return "never logged in"; 
          }
      }
    },
    { 
      field: "roles", 
      headername: "roles",
      filter: true, 
      valueformatter: (params) => 
      { 
          if (params.data.role_ids.length > 1) {
              return "multiple";
          }
      }, 
      cellrenderer: (params) => 
      {
          if (params.data.role_ids.length > 1) 
          {
              params.settooltip(params.data.role_ids.join(", "));
              return params.valueformatted;
          }
          return `${params.data.role_ids}` ?? "tle";
      }
    },
    { field: "options", width: 140,  cellrenderer: (params) => {
        return `<div>${getarchiveoractivebuttonforuser(params.data.active, params.data.id)}${geteditbuttonforuser(params.data.id)}</div>`;
    },
    } 
  ]
};

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
                reject(error);
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
            Toast.fire({ title: response.message });
        }
    });
}

function ActivateUser(userID) {
    $.ajax({
        type: 'POST',
        url: '/backend/users/' + userID + '/activate',
        success: async function(response) {
            await PopulateUserManagementTable();
            Toast.fire({ title: response.message });
        }
    });
}

// function CreateAndAppendCell(row, content) {
//     const cell = document.createElement('td');
//     cell.innerHTML = content
//     row.appendChild(cell)
// }

function SetupPage() 
{
  editUserModal = new bootstrap.Modal(document.querySelector("div#user-edit-modal"));
  gridElement = document.querySelector('#user-management-grid');
  gridApi = agGrid.createGrid(gridElement, gridOptions);
  PopulateUserManagementTable();
}

async function PopulateUserManagementTable() {
    // let allUsers = await GetUsers()
    // let allRoles = await GetRoleNames()

    fetch("/backend/users")
    .then((response) => response.json())
    .then((data) => {
        gridApi.setGridOption("rowData", data?.users);
    });

    // Empty the table
    // $('#users-table tbody').empty();
    //
    // for (const user of allUsers){
    //     var selectedRoles = user.role_ids
    //
    //     actionsButton = document.createElement('button')
    //
    //     if (user.active) {
    //         actionsButton.onclick = function () {
    //             ArchiveUser(user.id)
    //         }
    //         actionsButton.innerHTML = "Archive"
    //     }
    //     else {
    //         actionsButton.onclick = function() {
    //             ActivateUser(user.id)
    //         }
    //         actionsButton.innerHTML = "Activate"
    //     }
    //
    //     var rolesDropdown = document.createElement('select');
    //     rolesDropdown.setAttribute('multiple', '');
    //     for (role of allRoles) {
    //         var selected = selectedRoles.includes(role.id) ? true : false;
    //         option = document.createElement('option')
    //         option.innerHTML = role.name
    //         option.value = role.id
    //         option.selected = selected
    //         rolesDropdown.appendChild(option)
    //     }
    //
    //     var row = document.createElement('tr')
    //     CreateAndAppendCell(row, user.username)
    //     CreateAndAppendCell(row, user.email)
    //     CreateAndAppendCell(row, user.full_name)
    //     CreateAndAppendCell(row, user.last_login)
    //     row.appendChild(rolesDropdown)
    //     CreateAndAppendCell(row, user.active)
    //     row.appendChild(actionsButton)
    //
    //     $('#users-table').append(row);
    // }
}

function UpdateSearchTerm(event) {
    gridApi.setGridOption('quickFilterText',event.target.value);
}

// Event listeners
document.addEventListener("DOMContentLoaded", SetupPage);
