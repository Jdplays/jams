import {
    getPrivateAccessLogs
} from '@global/endpoints'
import { QueryStringData, QueryStringKey } from "@global/endpoints_interfaces";
import { isNullEmptyOrSpaces, buildQueryString } from "@global/helper";
import { createGrid, GridApi, GridOptions, ValueFormatterParams } from 'ag-grid-community';

let gridApi:GridApi<any>;

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
        tooltipMouseTrack: true,
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
                field: 'user_display_name',
                headerName: "Display Name",
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
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
}

function populatePrivateAccessLogsTable() {
    initialiseAgGrid()
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

            let queryString = buildQueryString(queryData)
            let response = await getPrivateAccessLogs(queryString)

            let allLogs = response.data
            let totalRecords = response.pagination.pagination_total_records

            let lastRow = totalRecords <= endRow ? totalRecords : -1

            params.successCallback(allLogs, lastRow)
        }
    }

    gridApi.setGridOption("datasource", logsDataSource);

    //gridApi.setGridOption('rowData', allLogs)
}

document.addEventListener("DOMContentLoaded", populatePrivateAccessLogsTable);