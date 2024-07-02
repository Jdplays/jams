function fetchDataAndPopulateUserManagementTable() {
    $.ajax({
        url: '/admin/get_user_management_table',
        type: 'GET',
        success: function(response) {
            allRoles = response.all_roles;
            users = response.users;

            $('#users-table tbody').empty();

            users.forEach(function(user) {

                var selectedRoles = user.roles

                actionsButtonHtml = ''

                if (user.active) {
                    actionsButtonHtml = '<button onclick="archiveUser(' + user.id + ')">Archive</button>'
                }
                else {
                    actionsButtonHtml = '<button onclick="activateUser(' + user.id + ')">Activate</button>'
                }

                var dropdownHtml = '<select multiple>';
                allRoles.forEach(function(role) {
                    var selected = selectedRoles.includes(role) ? 'selected' : '';
                    dropdownHtml += '<option value="' + role + '" ' + selected + '>' + role + '</option>';
                })
                dropdownHtml += '</select>';

                var row = '<tr>' + 
                '<td>' + user.username + '</td>' +
                '<td>' + user.email + '</td>' +
                '<td>' + user.full_name + '</td>' +
                '<td>' + user.last_login + '</td>' +
                '<td>' + dropdownHtml + '</td>' +
                '<td>' + user.active + '</td>' +
                '<td>' + actionsButtonHtml + '</td>' +
                '</tr>';

                $('#users-table').append(row);
            });
        },
        error: function(error) {
            console.log('Error fetching data:', error);
        }
    });
}

function archiveUser(userID) {
    const data = {
        'user_id': userID
    }
    $.ajax({
        type: 'POST',
        url: '/admin/archive_user',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateUserManagementTable();
            }

            document.getElementById('user-request-response').innerHTML = response.message
        }
    });
}

function activateUser(userID) {
    const data = {
        'user_id': userID
    }
    $.ajax({
        type: 'POST',
        url: '/admin/activate_user',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function(response) {
            if (response.status === 'success') {
                fetchDataAndPopulateUserManagementTable();
            }

            document.getElementById('user-request-response').innerHTML = response.message
        }
    });
}

// Event listeners
document.addEventListener("DOMContentLoaded", fetchDataAndPopulateUserManagementTable);