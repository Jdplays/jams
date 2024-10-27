import {
    getRoles,
    getRole,
    addNewRole,
    editRole,
    deleteRole,
    getPageNames
} from "@global/endpoints"
import { RequestMultiModelJSONData } from "@global/endpoints_interfaces";
import { successToast, errorToast, getSelectValues, emptyElement, isNullEmptyOrSpaces, buildEditButtonForModel, isDefined, buildQueryString } from "@global/helper";
import { QueryStringData } from "@global/interfaces";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';
import TomSelect from 'tom-select';

let gridApi: GridApi<any>;

let pageNamesMap:Record<number,string> = {};

async function deleteRoleOnClick(roleId:number) {
    const response = await deleteRole(roleId)
    if (response) {
        successToast('Event Successfully Removed')
        populateRolesTable()
    }
    else {
        errorToast()
    }
}

async function addRoleOnClick() {
    const data:Partial<RequestMultiModelJSONData> = {
        'name': (document.getElementById('add-role-name') as HTMLInputElement).value,
        'description': (document.getElementById('add-role-description') as HTMLInputElement).value,
        'page_ids': getSelectValues((document.getElementById('add-role-select-pages') as HTMLSelectElement)),
    }

    const response = await addNewRole(data)
    if (response) {
        successToast('Event Successfully Added')
        populateRolesTable()
    }
    else {
        errorToast()
    }
}

async function editRoleOnClick() {
    const roleId:number = Number((document.getElementById('edit-role-id') as HTMLInputElement).value)
    const data = {
        'name': (document.getElementById('edit-role-name') as HTMLInputElement).value,
        'description': (document.getElementById('edit-role-description') as HTMLInputElement).value,
        'page_ids': getSelectValues((document.getElementById('edit-role-select-pages') as HTMLSelectElement)),
    }

    const response = await editRole(roleId, data)
    if (response) {
        successToast('Event Successfully Edited')
        populateRolesTable()
    }
    else {
        errorToast()
    }
}

async function prepAddRoleForm() {
    let addRolePagesContainer = document.getElementById('add-role-pages-container')
    emptyElement(addRolePagesContainer)

    let select = document.createElement('select')
    select.id = 'add-role-select-pages'
    select.name = 'page_ids[]'
    select.multiple = true

    // Add all pages
    for (const [id, name] of Object.entries(pageNamesMap)) {
        let option = document.createElement('option')
        option.value = id
        option.text = name
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

async function prepEditRoleForm(roleId:number) {
    let role = await getRole(roleId)

    let editRolePagesContainer = document.getElementById('edit-role-pages-container')
    emptyElement(editRolePagesContainer)

    const hiddenIdInput = document.getElementById('edit-role-id') as HTMLInputElement
    const nameInput = document.getElementById('edit-role-name') as HTMLInputElement
    const descriptionInput = document.getElementById('edit-role-description') as HTMLInputElement

    hiddenIdInput.value = String(roleId)
    nameInput.value = role.name
    descriptionInput.value = role.description

    let select = document.createElement('select')
    select.id = 'edit-role-select-pages'
    select.name = 'page_ids[]'
    select.multiple = true

    for (const [id, name] of Object.entries(pageNamesMap)) {
        let option = document.createElement('option')
        option.value = id
        option.text = name
        option.selected = (role.page_ids.includes(parseInt(id)))
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

function renderPageNames(rolePageIds:number[]) {
    let rolePageNames:string
    if (!rolePageIds || rolePageIds.length <= 0) {
        rolePageNames = 'No Pages'
    } else {
        rolePageNames = rolePageIds.map(id => pageNamesMap[id]).filter(name => !isNullEmptyOrSpaces(name)).join(', ');
    }

    return rolePageNames
}

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        autoSizeStrategy: {
            type: 'fitGridWidth'
        },
        tooltipShowDelay:100,
        tooltipMouseTrack: true,
        columnDefs: [
            {field: 'name', flex: 1},
            {field: 'description', flex: 1},
            {
                field: 'pages', cellRenderer: (params:any) => {
                    const rolePageIds:number[] = params.data.page_ids
                    return renderPageNames(rolePageIds)
                },
                flex: 1,
                tooltipValueGetter: (params:any) => {
                    const rolePageIds:number[] = params.data.page_ids
                    return renderPageNames(rolePageIds)
                },
            },
            {
                field: 'options', cellRenderer: (params:any) => {
                    let actionsDiv = document.createElement('div')
                    let editButton = buildEditButtonForModel(params.data.id, 'edit-role-modal', prepEditRoleForm)
                    let deleteButton = document.createElement('button')
                    deleteButton.classList.add('btn', 'btn-danger', 'py-1', 'px-2', 'mb-1')
                    deleteButton.innerHTML = 'Delete'
                    deleteButton.onclick = function () {
                        deleteRoleOnClick(params.data.id)
                    }
                    deleteButton.style.padding = '10px'

                    actionsDiv.appendChild(editButton)
                    actionsDiv.appendChild(deleteButton)
                    
                    return actionsDiv
                },
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('roles-data-grid') as HTMLElement
    gridApi = createGrid(gridElement, gridOptions)

    populateRolesTable()
}

async function preloadPageNames() {
    const queryData:Partial<QueryStringData> = {
        parent_id:'null',
        public:false
    }
    const queryString = buildQueryString(queryData)
    const response = await getPageNames(queryString);
    let pages = response.data
    let pageNamesMap:Record<number,string> = {};
    pages.forEach(page => {
        pageNamesMap[page.id] = page.name;
    });
    return pageNamesMap;
}

async function populateRolesTable() {
    const queryData:Partial<QueryStringData> = {
        $all_rows: true
    }
    const queryString = buildQueryString(queryData)
    
    const response = await getRoles(queryString);
    const allRoles = response.data
    pageNamesMap = await preloadPageNames()

    gridApi.setGridOption('rowData', allRoles as any)
}

// Event listeners
document.addEventListener("DOMContentLoaded", initialiseAgGrid);
document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).prepAddRoleForm = prepAddRoleForm;
        (<any>window).addRoleOnClick = addRoleOnClick;
        (<any>window).editRoleOnClick = editRoleOnClick;
    }
});