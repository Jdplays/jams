import {
    getCurrentUserId,
    getUsers,
    editUser,
    archiveUser,
    activateUser,
    getRoles,
    getUserField
} from '@global/endpoints'
import { Role, User } from "@global/endpoints_interfaces";
import { emptyElement, buildActionButtonsForModel, successToast, errorToast, formatDateToShort, buildQueryString, buildRoleBadge, addSpinnerToElement, removeSpinnerFromElement, isDefined, getCheckboxInputGroupSelection, getRadioInputGroupSelection, setRadioInputGroupSelection } from "@global/helper";
import { QueryStringData } from '@global/interfaces';
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let gridApi:GridApi<any>;

let rolesMap:Record<number,Role> = {};
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
    const enableCustomBadgeToggle = document.getElementById('toggle-custom-badge') as HTMLInputElement

    let roleIds = getCheckboxInputGroupSelection(document.getElementById('edit-user-select-roles') as HTMLSelectElement, 'roles').map(Number)

    let badgeText = (document.getElementById('edit-user-badge-name') as HTMLInputElement).value
    let badgeIcon = getRadioInputGroupSelection(document.getElementById('edit-user-badge-icon') as HTMLInputElement, 'badge-icon')

    if (!enableCustomBadgeToggle.checked) {
        badgeText = null
        badgeIcon = null
    }

    const data:Partial<User> = {
        role_ids: roleIds,
        badge_text: badgeText,
        badge_icon: badgeIcon
    }

    editUser(userId, data).then(() => {
        successToast('User Successfully Edited')
        populateUserManagementTable()
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

function toggleCustomBadgeOnClick() {
    const badgeToggle = document.getElementById('toggle-custom-badge') as HTMLInputElement
    const badgeContent = document.getElementById('custom-badge-content') as HTMLDivElement

    if (badgeToggle.checked) {
        badgeContent.style.display = 'block'
    } else {
        badgeContent.style.display = 'none'
    }
}

async function prepEditUserForm(userId:number) {
    (document.getElementById('edit-user-id') as HTMLInputElement).value = String(userId)

    const customBadgeBlock = document.getElementById('custom-badge-block')
    const customBadgeData = document.getElementById('custom-badge-data')

    customBadgeData.style.display = 'none'
    addSpinnerToElement(customBadgeBlock)

    const editUserRolesContainer = document.getElementById('edit-user-roles-container')
    emptyElement(editUserRolesContainer)

    addSpinnerToElement(editUserRolesContainer)
    getUserField(userId, 'role_ids').then((userRoles) => {
        let roleOptions = document.createElement('div')
        roleOptions.id = 'edit-user-select-roles'
        roleOptions.classList.add('form-selectgroup')

        for (const role of Object.values(rolesMap)) {
            let option = document.createElement('label')
            option.classList.add('form-selectgroup-item')

            let input = document.createElement('input')
            input.type = 'checkbox'
            input.name = 'roles'
            input.value = String(role.id)
            input.classList.add('form-selectgroup-input')
            option.appendChild(input)

            if (userRoles.role_ids.includes(role.id)) {
                input.checked = true
            }

            let text = document.createElement('span')
            text.classList.add('form-selectgroup-label')
            text.style.width = 'fit-content'
            text.style.borderRadius = '90px'
            text.innerHTML = role.name

            let badge = document.createElement('span')
            badge.classList.add('badge', 'ms-2')
            badge.style.backgroundColor = role.display_colour
            text.appendChild(badge)
            option.appendChild(text)

            roleOptions.appendChild(option)
        }

        editUserRolesContainer.appendChild(roleOptions)
        removeSpinnerFromElement(editUserRolesContainer)
    })
    
    const enableCustomBadgeToggle = document.getElementById('toggle-custom-badge') as HTMLInputElement

    const badgeTextInput = document.getElementById('edit-user-badge-name') as HTMLInputElement
    const badgeIconInput = document.getElementById('edit-user-badge-icon') as HTMLInputElement

    const [badgeTextResponse, badgeIconResponse] = await Promise.all([
        getUserField(userId, 'badge_text'),
        getUserField(userId, 'badge_icon')
    ]);
    
    const badgeTextValue = badgeTextResponse.badge_text;
    const badgeIconValue = badgeIconResponse.badge_icon;

    badgeTextInput.value = badgeTextValue
    enableCustomBadgeToggle.checked = badgeTextValue !== null
    setRadioInputGroupSelection(badgeIconInput, 'badge-icon', badgeIconValue)

    customBadgeData.style.display = 'block'
    removeSpinnerFromElement(customBadgeBlock)

    toggleCustomBadgeOnClick()

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
                field: 'roles',
                wrapText: true,
                autoHeight: true,
                cellRenderer: (params:any) => {
                    const userRoleIds:number[] = params.data.role_ids
                    const flexContainer = document.createElement('div')
                    flexContainer.classList.add('d-flex', 'flex-wrap')
                    if (!userRoleIds || userRoleIds.length <= 0) {
                        flexContainer.innerHTML = 'No Roles'
                    } else {
                        userRoleIds.forEach(id => {
                            flexContainer.appendChild(buildRoleBadge(rolesMap[id]))
                        })
                    }

                    return flexContainer
                },
                flex: 1,
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

async function preloadRoles() {
    const response = await getRoles();
    let roles = response.data
    let rolesMap:Record<number,Role> = {};
    roles.forEach(role => {
        rolesMap[role.id] = role;
    });
    return rolesMap;
}

async function populateUserManagementTable() {
    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }
    const queryString = buildQueryString(queryData)
    const response = await getUsers(queryString)
    let allUsers = response.data
    rolesMap = await preloadRoles()

    gridApi.setGridOption('rowData', allUsers)
}

// Event listeners
document.addEventListener("DOMContentLoaded", populateUserManagementTable);
document.addEventListener("DOMContentLoaded", initialiseAgGrid);
document.addEventListener("DOMContentLoaded", async function () {
    currentUserId = await getCurrentUserId()
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).toggleCustomBadgeOnClick = toggleCustomBadgeOnClick;
    }
});