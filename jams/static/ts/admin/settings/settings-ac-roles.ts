import { getRoles, deleteRole, getPageNames } from "@global/endpoints"
import { successToast, errorToast, isNullEmptyOrSpaces, buildQueryString, buildRoleBadge } from "@global/helper";
import { QueryStringData } from "@global/interfaces";
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

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
        domLayout: 'autoHeight',
        tooltipShowDelay:100,
        tooltipMouseTrack: true,
        columnDefs: [
            {
                field: 'name',
                pinned: true,
                minWidth: 150,
                cellRenderer: (params:any) => {
                    const flexContainer = document.createElement('div')
                    flexContainer.classList.add('d-flex')
                    flexContainer.appendChild(buildRoleBadge(params.data))
                    
                    return flexContainer
                },
                flex: 1
            },
            {field: 'description', minWidth: 300, flex: 1},
            {
                field: 'pages', cellRenderer: (params:any) => {
                    const rolePageIds:number[] = params.data.page_ids
                    return renderPageNames(rolePageIds)
                },
                minWidth: 300,
                flex: 1,
                tooltipValueGetter: (params:any) => {
                    const rolePageIds:number[] = params.data.page_ids
                    return renderPageNames(rolePageIds)
                },
            },
            {
                field: 'options', cellRenderer: (params:any) => {
                    let actionsDiv = document.createElement('div')

                    let editButton = document.createElement('a')
                    editButton.classList.add('btn', 'btn-outline-primary', 'py-1', 'px-2', 'mb-1')
                    editButton.style.marginRight = '10px'
                    editButton.innerHTML = 'Edit'
                    editButton.href = `/private/admin/settings/roles/${params.data.id}/edit`
                    actionsDiv.appendChild(editButton)

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
                flex: 1, minWidth: 150
            }
        ]
    }

    const gridElement = document.getElementById('roles-data-grid') as HTMLElement
    gridApi = createGrid(gridElement, gridOptions)

    populateRolesTable()
}

async function preloadPageNames() {
    const queryData:Partial<QueryStringData> = {
        parent_id:null,
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
        $all_rows: true,
        $order_by: 'priority',
        $order_direction: 'ASC'
    }
    const queryString = buildQueryString(queryData)
    
    const response = await getRoles(queryString);
    const allRoles = response.data
    pageNamesMap = await preloadPageNames()

    gridApi.setGridOption('rowData', allRoles as any)
}

// Event listeners
document.addEventListener("DOMContentLoaded", initialiseAgGrid);