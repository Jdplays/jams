function structureNav() {
    const pagePath = window.location.pathname
    const pathParts = pagePath.split('/')

    let pageName = pathParts[pathParts.length - 1]
    if (pageName === 'add') {
        pageName = pathParts[pathParts.length - 2]
    } else if (pageName === 'edit') {
        pageName = pathParts[pathParts.length - 3]
    }

    if (pageName === 'settings') {
        return
    }

    const linkElement = document.getElementById(`${pageName}-link`) as HTMLAnchorElement

    linkElement.classList.remove('settings-nav-item')

    const accordionItem = linkElement.closest('.accordion-item')
    const accordionButton = accordionItem.querySelector('.accordion-button')
    const accordionBody = accordionItem.querySelector('.accordion-collapse')

    accordionButton.classList.remove('collapsed')
    accordionButton.ariaExpanded = 'true'

    accordionBody.classList.add('show')
}

document.addEventListener("DOMContentLoaded", structureNav);