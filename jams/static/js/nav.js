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
    let theme = getTheme()

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
        document.querySelectorAll(".ag-theme-quartz-dark").forEach((el) => el.classList.replace("ag-theme-quartz-dark","ag-theme-quartz"));
    } else if (theme === "light") {
        document.body.classList.remove("theme-dark");
        document.body.classList.add("theme-light");
        document.querySelectorAll(".ag-theme-quartz").forEach((el) => el.classList.replace("ag-theme-quartz","ag-theme-quartz-dark"));
    }
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains("theme-dark")) {
        body.classList.remove("theme-dark");
        body.classList.add("theme-light");
        document.querySelectorAll(".ag-theme-quartz-dark").forEach((el) => el.classList.replace("ag-theme-quartz-dark","ag-theme-quartz"));
        localStorage.setItem("theme", "light");
    } else {
        body.classList.remove("theme-light");
        body.classList.add("theme-dark");
        localStorage.setItem("theme", "dark");
        document.querySelectorAll(".ag-theme-quartz").forEach((el) => el.classList.replace("ag-theme-quartz","ag-theme-quartz-dark"));
    }
}

function getTheme() {
  localStorage.getItem("theme");
}

// Event listeners
document.addEventListener("DOMContentLoaded", loadNavigationBar);
document.addEventListener("DOMContentLoaded", loadTheme);
