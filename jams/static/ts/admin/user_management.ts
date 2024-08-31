import {
    getCurrentUserId,
    getUsers,
    getUserRoles,
    editUser,
    archiveUser,
    activateUser,
    getRoleNames
} from '@global/endpoints'
import { RequestMultiModelJSONData } from "@global/endpoints_interfaces";
import { emptyElement, buildActionButtonsForModel, successToast, errorToast, getSelectValues } from "@global/helper";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';
import TomSelect from 'tom-select';

let gridApi:GridApi<any>;

let roleNamesMap:Record<number,string> = {};
let currentUserId:number;

async function archiveUserOnClick(userId:number) {
    const response = await archiveUser(userId)
    if (response) {
        successToast('User Successfully Archived')
        populateUserManagementTable()
    }
    else {
        errorToast()
    }
}

async function activateUserOnClick(userId:number) {
    const response = await activateUser(userId)
    if (response) {
        successToast('User Successfully Activated')
        populateUserManagementTable()
    }
    else {
        errorToast()
    }
}

async function editUserOnClick() {
    const userId:number = Number((document.getElementById('edit-user-id') as HTMLInputElement).value)

    const data:Partial<RequestMultiModelJSONData> = {
        'role_ids': getSelectValues(document.getElementById('edit-user-select-roles') as HTMLSelectElement)
    }

    const response = await editUser(userId, data)
    if (response) {
        successToast('User Successfully Edited')
        populateUserManagementTable()
    }
    else {
        errorToast()
    }
}

async function prepEditUserForm(userId:number) {
    (document.getElementById('edit-user-id') as HTMLInputElement).value = String(userId)
    let userRoles = await getUserRoles(userId)

    let editUserRolesContainer = document.getElementById('edit-user-roles-container')
    emptyElement(editUserRolesContainer)

    let select = document.createElement('select')
    select.id = 'edit-user-select-roles'
    select.name = 'role_ids[]'
    select.multiple = true

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

    // Set button on clcik
    document.getElementById('edit-user-button').onclick = (function () {
        editUserOnClick()
    })
}

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
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
            {
                field: 'roles', cellRenderer: (params:any) => {
                    const userRoleIds:number[] = params.data.role_ids
                    let userRoleNames:string
                    if (!userRoleIds || userRoleIds.length <= 0) {
                        userRoleNames = 'No Role'
                    } else {
                        userRoleNames = userRoleIds.map(id => roleNamesMap[id] || 'Unknown Role').join(', ');
                    }

                    return userRoleNames
                }, flex: 1
            },
            {
                field: 'options', cellRenderer: (params:any) => {
                    const isCurrentUser = params.data.id === currentUserId
                    const actionsDiv = buildActionButtonsForModel(params.data.id, params.data.active, archiveUserOnClick, activateUserOnClick, 'edit-user-modal', prepEditUserForm)
                    const editButton = actionsDiv.querySelector(`#edit-${params.data.id}`) as HTMLButtonElement
                    let archiveActivateButton:HTMLButtonElement
                    if (params.data.active) {
                        archiveActivateButton = actionsDiv.querySelector(`#archive-${params.data.id}`) as HTMLButtonElement
                    }
                    else {
                        archiveActivateButton = actionsDiv.querySelector(`#activate-${params.data.id}`) as HTMLButtonElement
                    }

                    if (isCurrentUser) {
                        editButton.disabled = true
                        archiveActivateButton.disabled = true
                    }

                    return actionsDiv
                },
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('user-management-data-grid') as HTMLElement
    gridApi = createGrid(gridElement, gridOptions)
}

async function preloadRoleNames() {
    const response = await getRoleNames();
    let roles = response.data
    let roleNamesMap:Record<number,string> = {};
    roles.forEach(role => {
        roleNamesMap[role.id] = role.name;
    });
    return roleNamesMap;
}

async function populateUserManagementTable() {
    const response = await getUsers()
    let allUsers = response.data
    roleNamesMap = await preloadRoleNames()

    gridApi.setGridOption('rowData', allUsers)
}

// Event listeners
document.addEventListener("DOMContentLoaded", populateUserManagementTable);
document.addEventListener("DOMContentLoaded", initialiseAgGrid);
document.addEventListener("DOMContentLoaded", async function () {
    currentUserId = await getCurrentUserId()
});