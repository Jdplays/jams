function fetchDataAndPopulateUserManagementTable() {
    function fetchData() {
        $.ajax({
            url: '/api/admin/get_user_management_table',
            type: 'GET',
            success: function(response) {
                allRoles = response.all_roles;
                users = response.users;

                $('#users-table tbody').empty();

                users.forEach(function(user) {

                    var selectedRoles = user.roles

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
                    '<td>' + user.status + '</td>' +
                    '<td> Actions WIP (Disable, Delete) </td>' +
                    '</tr>';

                    $('#users-table').append(row);
                });
            },
            error: function(error) {
                console.log('Error fetching data:', error);
            }
        });
    }

    fetchData();
}

// Event listeners
document.addEventListener("DOMContentLoaded", fetchDataAndPopulateUserManagementTable);