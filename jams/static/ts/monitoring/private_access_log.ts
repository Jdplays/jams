import {
    archiveUser,
    getPrivateAccessLogs,
    getUsers
} from '@global/endpoints'
import { QueryStringData, QueryStringKey, User } from "@global/endpoints_interfaces";
import { isNullEmptyOrSpaces, buildQueryString, successToast, errorToast } from "@global/helper";
import { AgPromise, createGrid, GridApi, GridOptions, ITooltipComp, ITooltipParams, ValueFormatterParams } from 'ag-grid-community';

class CustomToolTip implements ITooltipComp {
    eGui!: HTMLElement;
    params!: ITooltipParams & { user: User|null };

    init(params: ITooltipParams & { user: User|null }) {
        const user = usersMap[params.data.user_id]
        if (!user) {
            return
        }

        let avatar = document.createElement('span')
        avatar.classList.add('avatar')
        if (user.avatar_url) {
            avatar.style.backgroundImage = `url(${user.avatar_url})`
        } else {
            let userInitials;
            if (user.first_name) {
                userInitials = `${user.first_name.toUpperCase()[0]}${user.last_name.toUpperCase()[0]}`
            } else {
                userInitials = user.display_name.toUpperCase()[0]
            }
            
            avatar.innerHTML = userInitials
        }

        let button = document.createElement('button')
        button.classList.add('btn', 'btn-danger')
        button.innerHTML = 'Disable'
        button.id = 'disable-user-button'
        if (!user.active) {
            button.disabled = true
        }

        const eGui = (this.eGui = document.createElement('div'));
        eGui.classList.add('custom-tooltip');
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
            const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
            errorToast(errorMessage)
        })
    }

    getGui() {
        return this.eGui;
    }
}

let gridApi:GridApi<any>;

let usersMap:Record<number, User> = {};

function dateTimeFormatter(params:ValueFormatterParams) {
    const dateStr = params.value;
    const dateObj = new Date(dateStr);

    if (isNullEmptyOrSpaces(dateStr)) {
        return ''
    }

    if (!(dateObj)) {
      return dateStr;
    }

    const timezoneMatch = dateStr.match(/([A-Z]+)$/);
    const timezone = timezoneMatch ? timezoneMatch[1] : 'UTC';

    const options:Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: timezone
    };

    return new Intl.DateTimeFormat('default', options).format(dateObj);
  }

  function getFilterModel() {
    return gridApi.getFilterModel()
}

  function onFilterChanged() {
    gridApi.purgeInfiniteCache()
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
                headerName: "Date Time",
                filter: 'agDateColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                width: 300,
                valueFormatter: dateTimeFormatter,
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
                tooltipComponent: CustomToolTip,
                tooltipField: 'user_id'
            },
            {
                field: 'url',
                headerName: "URL",
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                width: 400,
                tooltipValueGetter: (params:any) => params.value,
            },
            {
                field: 'internal_endpoint',
                headerName: "Internal Endpoint",
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                width: 400,
                tooltipValueGetter: (params:any) => params.value,
            },
            {
                field: 'user_role_names',
                headerName: 'User Roles',
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
            },
            {
                field: 'required_role_names',
                headerName: 'Required Roles',
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
            },
            {
                field: 'status_code',
                headerName: 'Status Code',
                filter: 'agNumberColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
            },
        ],
        rowModelType: 'infinite',
        cacheBlockSize: 50,
        onFilterChanged: onFilterChanged
    }

    const gridElement = document.getElementById('private-access-log-data-grid')
    gridElement.style.height = `${window.innerHeight * 0.8}px`;
    gridApi = createGrid(gridElement, gridOptions)

    populatePrivateAccessLogsTable()
}

async function populatePrivateAccessLogsTable() {

    usersMap = await preLoadUsers()

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
                } else {
                    filter = value.filter
                }
                if (typeof filter === 'string' && isNullEmptyOrSpaces(filter)) {
                    continue
                }

                const existingValue = queryData[filterKey];

                if (Array.isArray(existingValue)) {
                    (queryData[filterKey] as any[]).push(filter);
                } else if (existingValue !== undefined) {
                    (queryData[filterKey] as any[]) = [queryData[filterKey], filter] as any;
                } else {
                    (queryData[filterKey] as any[]) = [filter];
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

    gridApi.setGridOption("datasource", logsDataSource);
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

document.addEventListener("DOMContentLoaded", initialiseAgGrid);