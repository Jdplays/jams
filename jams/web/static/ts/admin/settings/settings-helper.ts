import { Page } from "@global/endpoints_interfaces";

export function generatePageCheckboxs(pages:Partial<Page>[]): HTMLElement {
    const container = document.createElement('div')

    pages.forEach(page => {
        const formattedName = page.name
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
        
        const checkLabel = document.createElement('label')
        checkLabel.classList.add('form-check')

        const input = document.createElement('input') as HTMLInputElement
        input.classList.add('form-check-input')
        input.type = 'checkbox'
        input.id = `page-${page.id}`
        input.value = String(page.id)

        const span = document.createElement('span')
        span.classList.add('form-check-label')
        span.textContent = formattedName

        checkLabel.appendChild(input)
        checkLabel.appendChild(span)
        container.appendChild(checkLabel)
    })

    return container
}

export function getSelectedPageIds(pageListContainer:HTMLElement): number[] {
    const selectedItems = pageListContainer.querySelectorAll<HTMLInputElement>('.form-check-input:checked')
    return Array.from(selectedItems).map(input => parseInt(input.value, 10))
}

export function checkPageInputsFromIds(pageListContainer:HTMLElement, ids:number[]): void {
    ids.forEach(id => {
        const input = pageListContainer.querySelector<HTMLInputElement>(`#page-${id}`)
        if (input) {
            input.checked = true
        }
    })
}