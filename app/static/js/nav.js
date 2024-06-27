function updateUserInfo() {
    fetch('/api/current_user_info')
        .then(response => response.json())
        .then (data => {
            if (data.error) {
                document.getElementById('nav_user_info').style.display = 'none';
                document.getElementById('nav_logout_button').style.display = 'none';

                document.getElementById('nav_login_button').style.display = 'block';
                document.getElementById('nav_register_button').style.display = 'block';
            }
            else {
                document.getElementById('nav_user_info').style.display = 'block';
                document.getElementById('nav_logout_button').style.display = 'block';
                document.getElementById('nav_user_name').textContent = data.user_name;
                document.getElementById('nav_user_role').textContent = data.user_role

                document.getElementById('nav_login_button').style.display = 'none';
                document.getElementById('nav_register_button').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching user info:', error);
            document.getElementById('nav_user_info').style.display = 'none';
            document.getElementById('nav_logout_button').style.display = 'none';
        });
}

// Event listeners
document.addEventListener("DOMContentLoaded", updateUserInfo);