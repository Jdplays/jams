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

function loadTheme() {
    let theme = localStorage.getItem("theme");

    if(theme === null) {
        const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
        if (prefersDarkTheme.matches) {
            localStorage.setItem("theme", "dark");
            theme = "dark";
        } else {
            localStorage.setItem("theme", "light");
            theme = "light";
        }
    }

    if (theme === "dark") {
        document.body.classList.remove("theme-light");
        document.body.classList.add("theme-dark");
    } else if (theme === "light") {
        document.body.classList.remove("theme-dark");
        document.body.classList.add("theme-light");
    }
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains("theme-dark")) {
        body.classList.remove("theme-dark");
        body.classList.add("theme-light");
        localStorage.setItem("theme", "light");
    } else {
        body.classList.remove("theme-light");
        body.classList.add("theme-dark");
        localStorage.setItem("theme", "dark");
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", loadNavigationBar);
document.addEventListener("DOMContentLoaded", loadTheme);
