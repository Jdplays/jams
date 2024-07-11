EVENTID = 1
USERID = 0

function GetLoggedInUserID() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/get_current_user_id',
            type: 'GET',
            success: function(response) {
                resolve(response.current_user_id);  
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetRoleIDFromName(roleName) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/roles/id?name=' + roleName,
            type: 'GET',
            success: function(response) {
                resolve(response.roles[0].id);  
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetAllUsersNamesWithRole(roleID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/users/display_name?role_ids=' + roleID,
            type: 'GET',
            success: function(response) {
                resolve(response.users);  
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

function GetAttendanceForVolunteer(userID, eventID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/users/' + userID + '/voluteer_attendences/' + eventID,
            type: 'GET',
            success: function(response) {
                resolve(response.voluteer_attendence);  
            },
            error: function(error) {
                if (error.status === 404) {
                    resolve(null);
                } else {
                    console.log('Error fetching data:', error);
                    reject(error);
                }
            }
        });
    });
}

function AddAttendance(userID, eventID, data) {
    $.ajax({
        type: 'POST',
        url: '/backend/users/' + userID + '/voluteer_attendences/' + eventID,
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            PopulateVolunteerAttendanceTable();
            document.getElementById('volunteer-attendance-request-response').innerHTML = response.message
        }
    });
}

function EditAttendance(userID, eventID, data) {
    $.ajax({
        type: 'PATCH',
        url: '/backend/users/' + userID + '/voluteer_attendences/' + eventID,
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            PopulateVolunteerAttendanceTable();
            document.getElementById('volunteer-attendance-request-response').innerHTML = response.message
        }
    });
}

function AddAttendanceOnClick(event) {
    event.preventDefault()
    const data = {
        'setup': document.getElementById('update-volunteer-attendance-setup').checked,
        'main': document.getElementById('update-volunteer-attendance-main').checked,
        'packdown': document.getElementById('update-volunteer-attendance-packdown').checked,
        'note': document.getElementById('update-volunteer-attendance-note').value
    }

    AddAttendance(USERID, EVENTID, data)
}

function EditAttendanceOnClick(event) {
    event.preventDefault()
    const data = {
        'id': document.getElementById('update-volunteer-attendance-id').value,
        'setup': document.getElementById('update-volunteer-attendance-setup').checked,
        'main': document.getElementById('update-volunteer-attendance-main').checked,
        'packdown': document.getElementById('update-volunteer-attendance-packdown').checked,
        'note': document.getElementById('update-volunteer-attendance-note').value
    }

    EditAttendance(USERID, EVENTID, data)
}

function CreateAndAppendCell(row, content) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

async function PopulateVolunteerAttendanceTable() {
    let volunteer_role_id = await GetRoleIDFromName('volunteer')
    let allVolunteers = await GetAllUsersNamesWithRole(volunteer_role_id)

    $('#volunteer-attendance-table tbody').empty();

    for (const volunteer of allVolunteers) {
        attendance = await GetAttendanceForVolunteer(volunteer.id, EVENTID)

        var row = document.createElement('tr')
        CreateAndAppendCell(row, volunteer.display_name)

        if (attendance == null) {
            CreateAndAppendCell(row, "No Data")
            CreateAndAppendCell(row, "No Data")
            CreateAndAppendCell(row, "No Data")
            CreateAndAppendCell(row, "No Data")
        }
        else
        {
            CreateAndAppendCell(row, attendance.setup)
            CreateAndAppendCell(row, attendance.main)
            CreateAndAppendCell(row, attendance.packdown)
            CreateAndAppendCell(row, attendance.note)
        }

        $('#volunteer-attendance-table').append(row)
    };
}

async function PopulateUpdateForm() {
    let loggedInUserID = await GetLoggedInUserID()
    USERID = loggedInUserID
    let loggedInUserAttendance = await GetAttendanceForVolunteer(loggedInUserID, EVENTID)

    updateAttendanceFormButton = document.getElementById('update-volunteer-attendance-submit')
    updateAttendanceFormTitle = document.getElementById('update-volunteer-attendance-title')

    if (loggedInUserAttendance == null) {
        // User hasnt submitted attendance yet
        updateAttendanceFormButton.onclick = AddAttendanceOnClick
        updateAttendanceFormTitle.innerHTML = 'Add Attendance'
    }
    else {
        updateAttendanceFormButton.onclick = EditAttendanceOnClick
        updateAttendanceFormTitle.innerHTML = 'Update Attendance'

        console.log(loggedInUserAttendance.setup)

        document.getElementById('update-volunteer-attendance-id').value = loggedInUserID,
        document.getElementById('update-volunteer-attendance-setup').checked = loggedInUserAttendance.setup,
        document.getElementById('update-volunteer-attendance-main').checked = loggedInUserAttendance.main,
        document.getElementById('update-volunteer-attendance-packdown').checked = loggedInUserAttendance.packdown,
        document.getElementById('update-volunteer-attendance-note').value = loggedInUserAttendance.note
    }
}


document.addEventListener("DOMContentLoaded", PopulateVolunteerAttendanceTable);
document.addEventListener("DOMContentLoaded", PopulateUpdateForm);