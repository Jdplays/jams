function getPrivateAccessLogs() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/private_access_logs',
            type: 'GET',
            success: function(response) {
                resolve(response.private_access_logs);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

function CreateAndAppendCell(row, content) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

async function populatePrivateAccessLogsTable() {
    const allLogs = await getPrivateAccessLogs()

    $('#private-access-log-table tbody').empty();

    for (const log of allLogs) {
        var row = document.createElement('tr')
        CreateAndAppendCell(row, log.id)
        CreateAndAppendCell(row, log.date_time)
        CreateAndAppendCell(row, log.url)
        CreateAndAppendCell(row, log.internal_endpoint)
        CreateAndAppendCell(row, log.user_id)
        CreateAndAppendCell(row, log.user_display_name)
        CreateAndAppendCell(row, log.user_role_names)
        CreateAndAppendCell(row, log.required_role_names)
        CreateAndAppendCell(row, log.status_code)

        $('#private-access-log-table').append(row);
    };
}

document.addEventListener("DOMContentLoaded", populatePrivateAccessLogsTable);