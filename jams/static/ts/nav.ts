function loadNavigationBar() {
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
        // Check the current URL path
        const currentPath:string = window.location.pathname;
        let navUrl;

        // Determine which nav bar to load based on the path
        if (currentPath.startsWith('/private') || currentPath.startsWith('/login') || currentPath.startsWith('/register')) {
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
        document.querySelectorAll('.ag-theme-quartz').forEach(grid => {
            grid.classList.add('ag-theme-quartz-dark');
        });
    } else if (theme === "light") {
        document.body.classList.remove("theme-dark");
        document.body.classList.add("theme-light");
        document.querySelectorAll('.ag-theme-quartz').forEach(grid => {
            grid.classList.remove('ag-theme-quartz-dark');
        });
    }
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains("theme-dark")) {
        body.classList.remove("theme-dark");
        body.classList.add("theme-light");
        localStorage.setItem("theme", "light");
        document.querySelectorAll('.ag-theme-quartz').forEach(grid => {
            grid.classList.remove('ag-theme-quartz-dark');
        });
    } else {
        body.classList.remove("theme-light");
        body.classList.add("theme-dark");
        localStorage.setItem("theme", "dark");
        document.querySelectorAll('.ag-theme-quartz').forEach(grid => {
            grid.classList.add('ag-theme-quartz-dark');
        });
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", loadNavigationBar);
document.addEventListener("DOMContentLoaded", loadTheme);
