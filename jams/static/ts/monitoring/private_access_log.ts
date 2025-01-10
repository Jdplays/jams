import { dateTimeFormatter, StatusCodeFilter } from '@global/ag_grid_helper'
import {
    archiveUser,
    getPrivateAccessLogs,
    getRoles,
    getUsers
} from '@global/endpoints'
import { Role, User } from "@global/endpoints_interfaces"
import { isNullEmptyOrSpaces, buildQueryString, successToast, errorToast, buildUserAvatar, formatDate, formatDateToShort, buildRoleBadge } from "@global/helper"
import { QueryStringData, QueryStringKey } from '@global/interfaces'
import { createGrid, GridApi, GridOptions, ITooltipComp, ITooltipParams } from 'ag-grid-community'

class UserToolTip implements ITooltipComp {
    eGui!: HTMLElement
    params!: ITooltipParams & { user: User|null }

    init(params: ITooltipParams & { user: User|null }) {
        const user = usersMap[params.data.user_id]
        if (!user) {
            return
        }

        const userAvatarInfo = (({id, display_name, first_name, last_name, avatar_url}) => ({
            id,
            display_name,
            first_name,
            last_name,
            avatar_url
        }))(user)

        const avatar = buildUserAvatar(userAvatarInfo)

        let button = document.createElement('button')
        button.classList.add('btn', 'btn-danger')
        button.innerHTML = 'Disable'
        button.id = 'disable-user-button'
        if (!user.active) {
            button.disabled = true
        }

        const eGui = (this.eGui = document.createElement('div'))
        eGui.classList.add('custom-tooltip')
        eGui.innerHTML = `
            <div class="card card-sm">
                <div class="card-body">
                    <div class="row">
                        <div class="col-auto">
                            ${avatar.outerHTML}
                        </div>
                        <div class="col">
                            <div class="text-truncate">
                                ${user.display_name}
                            </div>
                            <div class="text-secondary">${user.email}</div>
                        </div>
                        <div class="col-auto align-self-center">
                            ${button.outerHTML}
                        </div>
                    </div>
                </div>
            </div>
            `;

        (eGui.querySelector('#disable-user-button') as HTMLButtonElement).onclick = () => {
            this.onDisableClicked(user.id, params)
        }
    }

    onDisableClicked(userId:number, params:ITooltipParams) {
        if (params.hideTooltipCallback) {
            params.hideTooltipCallback()
        }
        archiveUser(userId).then((response) => {
            successToast(response.message)
            populatePrivateAccessLogsTable()
        }).catch((error) => {
            const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred'
            errorToast(errorMessage)
        })
    }

    getGui() {
        return this.eGui
    }
}

class RolesTooltip {
    private tooltipElement: HTMLDivElement

    init(params: any) {
        this.tooltipElement = document.createElement('div')
        this.tooltipElement.classList.add('custom-tooltip-container')

        const roleNames = params.value  
            .replace(/[{}]/g, '')
            .split(',')
            .map((item: string) => item.replace(/"/g, '').trim())

        for (const [index, name] of roleNames.entries()) {
            if (index === 0) {
                continue
            }

            let badge = buildRoleBadge(null, name)
            if (rolesMap[name]) {
                badge = buildRoleBadge(rolesMap[name])
            }

            this.tooltipElement.appendChild(badge)
        }
    }

    getGui() {
        return this.tooltipElement
    }
}

let gridApi:GridApi<any>

let usersMap:Record<number, User> = {}
let rolesMap:Record<string,Role> = {}

  function getFilterModel() {
    return gridApi.getFilterModel()
}

  function onFilterChanged() {
    gridApi.purgeInfiniteCache()
}

const renderRolesWithTooltip = (roleNamesText: string | undefined): HTMLDivElement | string => {
    if (!roleNamesText) {
        return 'N/A'
    }
    const roleNames = roleNamesText
        .replace(/[{}]/g, '')
        .split(',')
        .map(item => item.replace(/"/g, '').trim())

    const flexContainer = document.createElement('div')
    flexContainer.classList.add('d-flex', 'flex-wrap', 'align-items-center')

    if (roleNamesText === '{}') {
        const naBadge = document.createElement('span')
        naBadge.classList.add('tag-with-indicator')
        naBadge.style.width = 'fit-content'
        naBadge.style.borderRadius = '90px'
        naBadge.innerText = 'N/A'
        flexContainer.appendChild(naBadge)
        return flexContainer
    }

    // Add the first role
    if (roleNames[0]) {
        if (rolesMap[roleNames[0]]) {
            flexContainer.appendChild(buildRoleBadge(rolesMap[roleNames[0]]))
        } else {
            flexContainer.appendChild(buildRoleBadge(null, roleNames[0]))
        }
    }

    // Add "+X" badge if there are more roles
    if (roleNames.length > 1) {
        const moreBadge = document.createElement('span')
        moreBadge.classList.add('tag-with-indicator')
        moreBadge.style.width = 'fit-content'
        moreBadge.style.borderRadius = '90px'
        moreBadge.innerText = `+${roleNames.length - 1}`
        flexContainer.appendChild(moreBadge)
    }

    // Add the tooltip with all roles
    flexContainer.setAttribute('data-tooltip', roleNames.join(', ')) // For tooltip
    flexContainer.classList.add('custom-tooltip') // Tooltip styling

    return flexContainer
}

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        autoSizeStrategy: {
            type: 'fitGridWidth'
        },
        tooltipShowDelay:100,
        tooltipInteraction: true,
        defaultColDef: {
            sortable: false
          },
        columnDefs: [
            {
                field: 'date_time',
                pinned: true,
                headerName: "Date Time",
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value)
                    return fDateTime
                    
                },
                filter: 'agDateColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                suppressHeaderFilterButton: true,
                minWidth: 150,
            },
            {
                field: 'user_id',
                headerName: "Display Name",
                cellRenderer: (params:any) => {
                    if (!params.value) {
                        return 'N/A'
                    }

                    const user = usersMap[params.value]

                    if (!user) {
                        return 'Unknown'
                    } else {
                        return user.display_name
                    }
                },
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                suppressHeaderFilterButton: true,
                tooltipComponent: UserToolTip,
                tooltipField: 'user_id'
            },
            {
                field: 'url',
                headerName: "URL",
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                suppressHeaderFilterButton: true,
                width: 400,
                tooltipValueGetter: (params:any) => params.value,
            },
            {
                field: 'internal_endpoint',
                headerName: "Internal Endpoint",
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                suppressHeaderFilterButton: true,
                width: 400,
                tooltipValueGetter: (params:any) => params.value,
            },
            {
                field: 'user_role_names',
                headerName: 'User Roles',
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                suppressHeaderFilterButton: true,
                wrapText: true,
                minWidth: 200,
                cellRenderer: (params: any): HTMLDivElement | string => renderRolesWithTooltip(params.value),
                tooltipComponent: RolesTooltip,
                tooltipField: 'user_role_names'
            },
            {
                field: 'required_role_names',
                headerName: 'Accepted Roles',
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                suppressHeaderFilterButton: true,
                wrapText: true,
                minWidth: 200,
                cellRenderer: (params: any): HTMLDivElement | string => renderRolesWithTooltip(params.value),
                tooltipComponent: RolesTooltip,
                tooltipField: 'required_role_names'
            },
            {
                field: 'status_code',
                headerName: 'Status Code',
                filter: StatusCodeFilter,
                floatingFilter: true,
            },
        ],
        rowModelType: 'infinite',
        cacheBlockSize: 50,
        onFilterChanged: onFilterChanged
    }

    const gridElement = document.getElementById('private-access-log-data-grid')
    gridElement.style.height = `${window.innerHeight * 0.8}px`
    gridApi = createGrid(gridElement, gridOptions)

    populatePrivateAccessLogsTable()
}

async function populatePrivateAccessLogsTable() {

    [usersMap, rolesMap] = await Promise.all([
        preLoadUsers(),
        preloadRoles()
    ])

    const logsDataSource = {
        rowCount: 0,
        getRows: async function (params:any) {
            const { startRow, endRow } = params
            const blockSize = endRow - startRow

            let filters = getFilterModel()

            let queryData:Partial<QueryStringData> = {
                $pagination_block_size: blockSize,
                $pagination_start_index: startRow,
                $order_by: "date_time",
                $order_direction: "DESC"
            }

            for (const [key, value] of Object.entries(filters)) {
                if (!(key in queryData)) confirm

                const filterKey = key as QueryStringKey
                let filter:any

                if (filterKey === 'date_time') {
                    filter = value.dateFrom
                } else if (filterKey === 'user_id') {
                    const filteredUserKeys: number[] = Object.entries(usersMap)
                    .filter(([key, user]) =>
                        user.display_name.toLowerCase().includes(value.filter.toLowerCase())
                    ).map(([key]) => Number(key))

                    filter = filteredUserKeys
                } else if (filterKey === 'status_code') {
                    filter = value
                } else {
                    filter = value.filter
                }
                if (typeof filter === 'string' && isNullEmptyOrSpaces(filter)) {
                    continue
                }

                const existingValue = queryData[filterKey]

                if (Array.isArray(existingValue)) {
                    (queryData[filterKey] as any[]).push(filter)
                } else if (existingValue !== undefined) {
                    (queryData[filterKey] as any[]) = [queryData[filterKey], filter] as any
                } else {
                    (queryData[filterKey] as any[]) = [filter]
                }
            }

            gridApi.setGridOption('loading', true)
            let queryString = buildQueryString(queryData)
            let response = await getPrivateAccessLogs(queryString)

            let allLogs = response.data
            let totalRecords = response.pagination.pagination_total_records

            let lastRow = totalRecords <= endRow ? totalRecords : -1

            params.successCallback(allLogs, lastRow)
            gridApi.setGridOption('loading', false)
        }
    }

    gridApi.setGridOption("datasource", logsDataSource)
}

async function preLoadUsers() {
    const response = await getUsers()
    let users = response.data
    let usersMap:Record<number, User> = {}
    users.forEach(user => {
        usersMap[user.id] = user
    })
    return usersMap
}

async function preloadRoles() {
    const response = await getRoles()
    let roles = response.data
    let rolesMap:Record<string,Role> = {}
    roles.forEach(role => {
        rolesMap[role.name] = role
    })
    return rolesMap
}

document.addEventListener("DOMContentLoaded", initialiseAgGrid)