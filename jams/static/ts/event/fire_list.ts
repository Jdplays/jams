import {
    checkInFireListEntry,
    checkOutFireListEntry,
    getFireList,
} from "@global/endpoints";
import { FireListEntry } from "@global/endpoints_interfaces";
import { EventDetails, EventDetailsOptions } from "@global/event_details";
import { successToast, errorToast, isDefined, emptyElement, buildQueryString, stringToFireListEntryType } from "@global/helper";
import { FireListEntryType, QueryStringData } from "@global/interfaces";
import { createGrid, GridApi, GridOptions, RowDataTransaction } from 'ag-grid-community';

let gridApi: GridApi<any>;
let eventDetails:EventDetails;

let fireListEntryTypeFilter:FireListEntryType = null;


function applyQuickFilter() {
    const filterText = (document.getElementById("quick-filter") as HTMLInputElement).value
    gridApi.setGridOption('quickFilterText', filterText);
}

async function filterByType(typeString: string | null) {
    fireListEntryTypeFilter = stringToFireListEntryType(typeString)
    updateFilterButtons()

    gridApi.setGridOption('loading', true)
    await populateFireListTable()
    gridApi.setGridOption('loading', false)
}

function initialiseAgGrid() {
    const gridOptions:GridOptions = {
        tooltipShowDelay:100,
        tooltipMouseTrack: true,
        domLayout: "autoHeight",
        enableCellTextSelection: true,
        getRowId: (params: any) => String(params.data.id),
        animateRows: true,
        suppressMovableColumns: true,
        columnDefs: [
            {
                field: 'name',
                maxWidth:120,
                wrapText: true,
                autoHeight: true,
                cellStyle: {lineHeight: 1.6},
                pinned: true,
                flex: 1
            },
            {
                field: 'email',
                minWidth:250,
                cellRenderer: (params:any) => {
                    if (params.data.type === 'VOLUNTEER') {
                        return 'N/A'
                    } else {
                        return params.data.email
                    }
                },
                tooltipValueGetter: (params:any) => {
                    if (params.data.type === 'VOLUNTEER') {
                        return 'N/A'
                    } else {
                        return params.data.email
                    }
                },
                flex: 1
            },
            {field: 'type', minWidth:150, flex: 1},
            {
                field: 'checked_in',
                headerName: 'Checked In',
                cellRenderer: 'agCheckboxCellRenderer',
                sortable: true,
                sort: 'desc',
                minWidth: 110,
                flex: 1
            },
            {
                field: 'actions',
                cellRenderer: (params:any) => {
                    let div = document.createElement('div')
                        
                    if (params.data.checked_in) {
                        let checkOutButton = document.createElement('button')
                        checkOutButton.classList.add('btn', 'btn-outline-danger', 'py-1', 'px-2', 'mb-1')
                        checkOutButton.innerHTML = 'Check Out'
                        checkOutButton.onclick = () => {
                            fireListEntryCheckOutOnClick(params.data.id)
                        }
                        div.appendChild(checkOutButton)
                    } else {
                        let checkInButton = document.createElement('button')
                        checkInButton.classList.add('btn', 'btn-outline-success', 'py-1', 'px-2', 'mb-1')
                        checkInButton.innerHTML = 'Check In'
                        checkInButton.onclick = () => {
                            fireListEntryCheckInOnClick(params.data.id)
                        }
                        div.appendChild(checkInButton)
                    }
                    return div
                },
                minWidth: 160,
                flex: 1
            }
        ]
    }

    const gridElement = document.getElementById('fire-list-data-grid') as HTMLElement
    gridElement.style.height = `${window.innerHeight * 0.7}px`;
    gridApi = createGrid(gridElement, gridOptions)


    gridApi.resetQuickFilter()
}

async function populateFireListTable(init:Boolean = false) {
    const gridElement = document.getElementById('fire-list-data-grid')

    const queryData:Partial<QueryStringData> = {
        $order_by: 'checked_in',
        $order_direction: 'DESC',
        $all_rows: true
    }

    if (fireListEntryTypeFilter) {
        queryData.type = fireListEntryTypeFilter
    }

    const queryString = buildQueryString(queryData)

    const response = await getFireList(eventDetails.eventId, queryString);
    let newRowData = response.data

    if (init) {
        emptyElement(gridElement)
        initialiseAgGrid()
    }

    const currentRowData:FireListEntry[] = [];
    gridApi.forEachNode(node => currentRowData.push(node.data));

    // Track the rows to be added, updated, or removed
    const transaction:RowDataTransaction = {
        add: [],
        update: [],
        remove: []
    };

    const currentRowMap = new Map<number, FireListEntry>();
    currentRowData.forEach(row => currentRowMap.set(row.id, row));

    // Rows to be re-rendered after the transaction
    const rowsToRedraw: any[] = [];

    newRowData.forEach(newRow => {
        const currentRow = currentRowMap.get(newRow.id);
        if (!currentRow) {
            transaction.add.push(newRow);
        } else if (JSON.stringify(currentRow) !== JSON.stringify(newRow)) {
            if (currentRow.checked_in !== newRow.checked_in) {
                // If 'checked_in' value changes, force re-render of the specific row
                rowsToRedraw.push(gridApi.getRowNode(String(currentRow.id)));
            }
            transaction.update.push(newRow);
        }
        currentRowMap.delete(newRow.id);
    });

    transaction.remove = Array.from(currentRowMap.values());

    gridApi.applyTransaction(transaction)

    // Re-render rows after the transaction is applied
    if (rowsToRedraw.length > 0) {
        gridApi.redrawRows({ rowNodes: rowsToRedraw });
    }
}

function fireListEntryCheckInOnClick(fireListEntryId:number) {
    checkInFireListEntry(eventDetails.eventId, fireListEntryId).then((response) => {
        successToast(response.message)
    }).catch(error => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

function fireListEntryCheckOutOnClick(fireListEntryId:number) {
    checkOutFireListEntry(eventDetails.eventId, fireListEntryId).then((response) => {
        successToast(response.message)
    }).catch(error => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}

function updateFilterButtons() {
    const showAll = document.getElementById('show-all-button')
    const volunteers = document.getElementById('volunteers-button')
    const attendees = document.getElementById('attendees-button')
    const guests = document.getElementById('guests-button')

    if (fireListEntryTypeFilter === FireListEntryType.VOLUNTEER) {
        volunteers.classList.remove('btn-outline-secondary')
        volunteers.classList.add('btn-secondary')

        showAll.classList.add('btn-outline-primary')
        showAll.classList.remove('btn-primary')

        attendees.classList.add('btn-outline-secondary')
        attendees.classList.remove('btn-secondary')

        guests.classList.add('btn-outline-secondary')
        guests.classList.remove('btn-secondary')
    } else if (fireListEntryTypeFilter === FireListEntryType.ATTENDEE) {
        attendees.classList.remove('btn-outline-secondary')
        attendees.classList.add('btn-secondary')

        showAll.classList.add('btn-outline-primary')
        showAll.classList.remove('btn-primary')

        volunteers.classList.add('btn-outline-secondary')
        volunteers.classList.remove('btn-secondary')

        guests.classList.add('btn-outline-secondary')
        guests.classList.remove('btn-secondary')
    } else if (fireListEntryTypeFilter === FireListEntryType.GUEST) {
        guests.classList.remove('btn-outline-secondary')
        guests.classList.add('btn-secondary')

        showAll.classList.add('btn-outline-primary')
        showAll.classList.remove('btn-primary')

        volunteers.classList.add('btn-outline-secondary')
        volunteers.classList.remove('btn-secondary')

        attendees.classList.add('btn-outline-secondary')
        attendees.classList.remove('btn-secondary')
    } else {
        showAll.classList.remove('btn-outline-primary')
        showAll.classList.add('btn-primary')

        volunteers.classList.add('btn-outline-secondary')
        volunteers.classList.remove('btn-secondary')

        attendees.classList.add('btn-outline-secondary')
        attendees.classList.remove('btn-secondary')

        guests.classList.add('btn-outline-secondary')
        guests.classList.remove('btn-secondary')
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
    const eventDetailsOptions:EventDetailsOptions = {
        dateInclusive: true,
        eventDependentElements: [document.getElementById('fire-list-data-grid-container')],
        eventOnChangeFunc: () => {
            populateFireListTable(true)
        }
    }

    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()

    if (eventDetails.eventId === -1) {
        return
    }

    initialiseAgGrid()

    gridApi.setGridOption('loading', true)
    await populateFireListTable(true)
    gridApi.setGridOption('loading', false)

    updateFilterButtons()

    window.setInterval(() => {
        populateFireListTable()
    }, 1000)
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).applyQuickFilter = applyQuickFilter;
        (<any>window).filterByType = filterByType;
    }
});
  