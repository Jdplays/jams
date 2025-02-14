import { dateTimeFormatter, StatusCodeFilter } from '@global/ag_grid_helper';
import { getExternalApiLogs } from '@global/endpoints'
import { isNullEmptyOrSpaces, buildQueryString, formatDateToShort } from "@global/helper";
import { QueryStringData, QueryStringKey } from '@global/interfaces';
import { createGrid, GridApi, GridOptions } from 'ag-grid-community';

let gridApi:GridApi<any>;

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
        suppressMovableColumns: true,
        columnDefs: [
            {
                field: 'date_time',
                headerName: "Date Time",
                cellRenderer: (params:any) => {
                    const fDateTime = formatDateToShort(params.value)
                    return fDateTime
                },
                filter: 'agDateColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                suppressHeaderFilterButton: true,
                width: 300,
                valueFormatter: dateTimeFormatter,
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
                field: 'status_code',
                headerName: "Status Code",
                filter: StatusCodeFilter,
                floatingFilter: true,
            },
        ],
        rowModelType: 'infinite',
        cacheBlockSize: 50,
        onFilterChanged: onFilterChanged
    }

    const gridElement = document.getElementById('external-api-log-data-grid')
    gridElement.style.height = `${window.innerHeight * 0.8}px`;
    gridApi = createGrid(gridElement, gridOptions)

    populateExternalAPILogsTable()
}

async function populateExternalAPILogsTable() {
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
                } else if (filterKey === 'status_code') {
                    filter = value
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
            let response = await getExternalApiLogs(queryString)

            let allLogs = response.data
            let totalRecords = response.pagination.pagination_total_records

            let lastRow = totalRecords <= endRow ? totalRecords : -1

            params.successCallback(allLogs, lastRow)
            gridApi.setGridOption('loading', false)
        }
    }

    gridApi.setGridOption("datasource", logsDataSource);
}

document.addEventListener("DOMContentLoaded", initialiseAgGrid);