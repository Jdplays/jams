import {
    getCurrentUserId,
    getUsers,
    getUserRoles,
    editUser,
    archiveUser,
    activateUser,
    getRoleNames
} from '@global/endpoints'
import { User } from "@global/endpoints_interfaces";
import { emptyElement, buildActionButtonsForModel, successToast, errorToast, getSelectValues, formatDateToShort, buildQueryString } from "@global/helper";
import { QueryStringData } from '@global/interfaces';
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';
import TomSelect from 'tom-select';

let gridApi:GridApi<any>;

let roleNamesMap:Record<number,string> = {};
let currentUserId:number;

function archiveUserOnClick(userId:number) {
    archiveUser(userId).then((response) => {
        successToast(response.message)
        populateUserManagementTable()
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

function activateUserOnClick(userId:number) {
    activateUser(userId).then((response) => {
        successToast(response.message)
        populateUserManagementTable()
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

function editUserOnClick() {
    const userId:number = Number((document.getElementById('edit-user-id') as HTMLInputElement).value)

    const data:Partial<User> = {
        'role_ids': getSelectValues(document.getElementById('edit-user-select-roles') as HTMLSelectElement)
    }

    editUser(userId, data).then(() => {
        successToast('User Successfully Edited')
        populateUserManagementTable()
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
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
        enableCellTextSelection: true,
        domLayout: 'autoHeight',
        defaultColDef: {
            wrapHeaderText: true,
            autoHeaderHeight: true,
            resizable:false
        },
        columnDefs: [
            {
                field: 'display_name',
                headerName: "Display Name",
                flex: 1,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                pinned: true,
                maxWidth: 200,
                initialWidth: 150
            },
            {
                field: 'email',
                flex: 1,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                minWidth: 200
            },
            {
                field: 'last_login',
                headerName: "Last Login",
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value)
                    return fDateTime
                },
                flex: 1,
                valueFormatter: (params) => {
                    if (!params.data.last_login) {
                        return 'Never logged in'
                    }
                },
                minWidth: 150
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
                },
                flex: 1,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                minWidth: 150
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
                flex: 1, minWidth: 150
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
    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }
    const queryString = buildQueryString(queryData)
    const response = await getUsers(queryString)
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