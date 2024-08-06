import {buildQueryString, isEmptyOrSpaces} from '../global/helper.js'

let gridApi;

function getPrivateAccessLogs(queryString=null) {
    return new Promise((resolve, reject) => {
        let url = '/backend/private_access_logs'
        if (queryString) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                resolve(response);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function dateTimeFormatter(params) {
    const dateStr = params.value;
    const dateObj = new Date(dateStr);

    if (isNaN(dateObj)) {
      return dateStr;
    }

    const timezoneMatch = dateStr.match(/([A-Z]+)$/);
    const timezone = timezoneMatch ? timezoneMatch[1] : 'UTC';

    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timezone: timezone
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
    const gridOptions = {
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
                tooltipValueGetter: (params) => params.value,
            },
            {
                field: 'internal_endpoint',
                headerName: "Internal Endpoint",
                filter: 'agTextColumnFilter',
                floatingFilter: true,
                suppressFloatingFilterButton: true,
                width: 400,
                tooltipValueGetter: (params) => params.value,
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
    gridApi = agGrid.createGrid(gridElement, gridOptions)
}

function populatePrivateAccessLogsTable() {
    initialiseAgGrid()
    const logsDataSource = {
        rowCount: undefined,
        getRows: async function (params) {
            const { startRow, endRow } = params
            const blockSize = endRow - startRow

            let filters = getFilterModel()

            let queryData = {
                $pagination_block_size: blockSize,
                $pagination_start_index: startRow,
                $order_by: "date_time",
                $order_direction: "DESC"
            }

            for (const [key, value] of Object.entries(filters)) {
                let filter
                if (key === 'date_time') {
                    filter = value.dateFrom
                } else {
                    filter = value.filter
                }
                if (typeof filter === 'string') {
                    if (isEmptyOrSpaces(filter)) {
                        continue
                    }
                }

                if (queryData[key]) {
                    queryData[key].push(filter)
                } else {
                    queryData[key] = [filter]
                }
            }

            let queryString = buildQueryString(queryData)
            let response = await getPrivateAccessLogs(queryString)

            let allLogs = response.private_access_logs
            let totalRecords = response.pagination_total_records

            let lastRow = totalRecords <= endRow ? totalRecords : -1

            params.successCallback(allLogs, lastRow)
        }
    }

    gridApi.setGridOption("datasource", logsDataSource);

    //gridApi.setGridOption('rowData', allLogs)
}

document.addEventListener("DOMContentLoaded", populatePrivateAccessLogsTable);

document.addEventListener("DOMContentLoaded", function () {
    let data = {
        field_1: [1, 2, 3, 4],
        field_2: "Test",
        field_3: "Bob",
        field_4: "$~field_3",
        field_5: "Bob",
        field_6: "$~field_3",
        field_7: null,
        field_8: true
    }

    let queryString = buildQueryString(data)
});