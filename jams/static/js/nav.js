function loadNavigationBar() {
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
        // Check the current URL path
        const currentPath = window.location.pathname;
        let navUrl;

        // Determine which nav bar to load based on the path
        if (currentPath.startsWith('/private')) {
            navUrl = '/private/nav';
        } else {
            navUrl = '/nav';
        }

        fetch(navUrl)
            .then(response => response.text())
            .then(html => {
                navContainer.innerHTML = html;
            })
            .catch(error => {
                console.error('Error loading navigation:', error);
            });
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", loadNavigationBar);