function loadNavigationBar() {
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
        fetch('/nav')
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