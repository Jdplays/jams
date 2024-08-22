// Event Schedule Page

import {
    getEventNames,
    getEvent,
    getWorkshops,
    getIconData,
    getDifficultyLevels
} from '../global/endpoints'

import {
    buildQueryString,
    emptyElement,
    createDropdown
} from '../global/helper'

import { WorkshopCard } from '../global/workshop_card'
import {ScheduleGrid, ScheduleGridOptions} from '../global/schedule_grid'
import TomSelect from 'tom-select';
import { QueryStringData } from '../global/endpoints_interfaces';


// Variables
var EventId:number = 1

var selectDifficultyIds:number[] = []
var selectedTags:number[] = []
var currentSearchQuery:string = ''

// Schedule Grid
const scheduleGridOptions:ScheduleGridOptions = {
    eventId: EventId,
    edit: true,
    size: 150
}

const scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)

// General Methods

// Event Selection

// Populates the Event selection dropdown with all of the events
async function populateEventSelectionDropdown() {
    const eventsResponse = await getEventNames()
    let events = eventsResponse.data

    let eventSelectionDropdown = document.getElementById('event-selection')
    let select = createDropdown(events, events[0].name, eventSelectionDropdownOnChange)
    select.id = 'event-select'
    select.classList.add('select-event-dropdown', 'form-control')
    eventSelectionDropdown.appendChild(select)
}

// Handles the onchange event for the Event selction dropdown 
function eventSelectionDropdownOnChange(event:Event) {
    const element = event.target as HTMLInputElement
    const selectedValue = Number(element.value)
    EventId = selectedValue
    getEvent(EventId)
    populateEventDetails()
    scheduleGrid.changeEvent(EventId)
}

// Event Details
// Populates the selected events details (name and date)
async function populateEventDetails() {
    let event = await getEvent(EventId)
    let eventDetailsContainer = document.getElementById('event-details-container')
    eventDetailsContainer.classList.add('event-details')
    
    let title = document.createElement('h2')
    title.innerHTML = event.name
    title.classList.add('event-details-element')

    let date = document.createElement('p')
    date.innerHTML = formatDate(event.date)
    title.classList.add('event-details-element')

    emptyElement(eventDetailsContainer)
    eventDetailsContainer.appendChild(title)
    eventDetailsContainer.appendChild(date)
}


// Workshop Selction
// Populates the list of workshop cards
async function populateWorkshopList() {
    let queryData:Partial<QueryStringData> = {
        name: currentSearchQuery,
        description: '$~name',
        difficulty_id: selectDifficultyIds
    }
    let queryString = buildQueryString(queryData)
    console.log(queryString)
    const workshopsResponse = await getWorkshops(queryString)
    const difficultyLevels = await getDifficultyLevels()

    let workshops = workshopsResponse.data

    let workshopList = document.getElementById('workshop-selection-list')

    let elementList = []

    // Populate the list
    for (const workshop of workshops) {
        const workshopListBlock = document.createElement('div')
        workshopListBlock.classList.add('workshop-list-block')
        let cardOptions = {
            size: 150,
            difficultyLevels: difficultyLevels
        }
        let workshopCard = new WorkshopCard(workshop, cardOptions)
        let workshopCardElement = await workshopCard.element()
        workshopCardElement.id = "drag-drop-workshop-" + workshop.id
        workshopCardElement.draggable = true
        workshopCardElement.addEventListener('dragstart', function (event) {
            drag(event, String(workshop.id))
        });
        workshopListBlock.appendChild(workshopCardElement)
        elementList.push(workshopListBlock)
    }

    // Empty the list
    emptyElement(workshopList)

    for (const element of elementList) {
        workshopList.append(element)
    }

}

// Handles updating the global reference of the selected difficulty ids
function updateDifficultyIdsList(checked:boolean, id:number) {
    if (checked) {
        // add To list
        if (!selectDifficultyIds.includes(id)) {
            selectDifficultyIds.push(id)
        }
    }
    else {
        // remove from list
        const index = selectDifficultyIds.indexOf(id)
        if (index > -1) {
            selectDifficultyIds.splice(index, 1)
        }
    }
}

// Populates the workshop selection tools (difficulties, tags)
async function populateWorkshopSelectionTools() {
    const workshopSelectionToolsContainer = document.getElementById('workshop-selection-tools-container')
    const difficultyLevels = await getDifficultyLevels()

    // Difficulty
    let difficultyContainer = document.createElement('div')
    difficultyContainer.classList.add('workshop-selection-tools-sub-container')

    let difficultyTitle = document.createElement('label')
    difficultyTitle.classList.add('form-label', 'workshop-selection-tools-title')
    difficultyTitle.innerText = 'Difficulty'
    difficultyContainer.appendChild(difficultyTitle)

    let difficultyOptions = document.createElement('div')
    difficultyOptions.classList.add('form-selectgroup', 'form-selectgroup-pills')

    for (const level of difficultyLevels) {
        let option = document.createElement('label')
        option.classList.add('form-selectgroup-item')

        let input = document.createElement('input')
        input.type = 'checkbox'
        input.classList.add('form-selectgroup-input')
        option.appendChild(input)
        input.onchange = function () {
            updateDifficultyIdsList(input.checked, level.id)
            populateWorkshopList()
        }

        let text = document.createElement('span')
        text.classList.add('form-selectgroup-label')
        text.innerHTML = level.name + ' '

        let badge = document.createElement('span')
        badge.classList.add('badge', 'ms-auto')
        badge.style.backgroundColor = level.display_colour
        text.appendChild(badge)
        option.appendChild(text)

        difficultyOptions.appendChild(option)
    }

    difficultyContainer.appendChild(difficultyOptions)


    // Tags
    let tagsContainer = document.createElement('div')
    tagsContainer.classList.add('workshop-selection-tools-sub-container')

    let tagsTitle = document.createElement('label')
    tagsTitle.classList.add('form-label', 'workshop-selection-tools-title')
    tagsTitle.innerText = 'Tags'
    tagsContainer.appendChild(tagsTitle)

    let tagsSelect = document.createElement('select')
    tagsSelect.id = 'select-tags'
    tagsSelect.name = 'tags[]'
    tagsSelect.multiple = true

    for(let i=0; i < 5; i++) {
        let option = document.createElement('option')
        option.value = String(i)
        option.text = 'tag ' + i
        tagsSelect.appendChild(option)
    }

    tagsContainer.appendChild(tagsSelect)

    emptyElement(workshopSelectionToolsContainer)
    workshopSelectionToolsContainer.appendChild(difficultyContainer)
    workshopSelectionToolsContainer.appendChild(tagsContainer)

    // Create the tom select for tags
    new TomSelect("#select-tags", {
        plugins: ['remove_button'],
        create: false,
        maxItems: null,
        onChange: function(values:any) {
            console.log(values)
            // TODO: ADD THIS WHEN TAGS ARE IMPLEMENTED
            //selectedTags = values
            //PopulateWorkshopList()
          }
      });
}

// Handles the event for when either of the workshop list scroll arrows are pressed
function handleWorkshopSelectionArrows() {
    const scrollContainer = document.getElementById('workshop-selection-list');
    const leftArrow = document.getElementById('workshop-selection-list-left-arrow');
    const rightArrow = document.getElementById('workshop-selection-list-right-arrow');

    function updateArrows() {
        const scrollLeft = scrollContainer.scrollLeft;
        const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        const leftIcon = leftArrow.querySelector('svg')
        const rightIcon = rightArrow.querySelector('svg')

        if (scrollLeft === 0) {
            leftIcon.style.display = 'none';
            rightIcon.style.display = 'block';
        } else if (scrollLeft >= maxScrollLeft) {
            leftIcon.style.display = 'block';
            rightIcon.style.display = 'none';
        } else {
            leftIcon.style.display = 'block';
            rightIcon.style.display = 'block';
        }

      }

    rightArrow.addEventListener('click', function () {
        scrollContainer.scrollBy({ left: 150, behavior: 'smooth' });
    });

    leftArrow.addEventListener('click', function () {
        scrollContainer.scrollBy({ left: -150, behavior: 'smooth' });
    });

    scrollContainer.addEventListener('scroll', updateArrows);

    // Initialize arrows visibility
    updateArrows();
}

// Handles the event for when the workshop selection search bar's input is updated
function workshopSearchOnChange() {
    let tmp = (document.getElementById('workshop-search-box') as HTMLInputElement).value
    let filtered = tmp.replace(/[?&|=\/\\]/g, '');

    currentSearchQuery = filtered

    populateWorkshopList()
}

// Can be added to an element to allow drag
function drag(ev:DragEvent, value:string) {
    ev.dataTransfer.setData("workshop-id", value);
    ev.dataTransfer.setData("drag-type", "blah");
    scheduleGrid.currentDragType = 'workshop-add'
}

// Formats a date from numbers to words (24-09-15 to 15th Spetember 2024)
function formatDate(dateString:string) {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    
    // Function to get the ordinal suffix for the day
    function getOrdinalSuffix(n:any) {
        if (n > 3 && n < 21) return 'th';
        switch (n % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
    
    const dayWithSuffix = day + getOrdinalSuffix(day);
    
    return `${dayWithSuffix} ${month} ${year}`;
}

// Event Listeners
document.addEventListener("DOMContentLoaded", populateEventSelectionDropdown);
document.addEventListener("DOMContentLoaded", populateEventDetails);
document.addEventListener("DOMContentLoaded", populateWorkshopList);
document.addEventListener("DOMContentLoaded", populateWorkshopSelectionTools);
document.addEventListener("DOMContentLoaded", function () {
    let search = document.getElementById('workshop-search-box')
    search.oninput = workshopSearchOnChange
});

// Load in workshop search arrow icons
document.addEventListener("DOMContentLoaded", async function () {
    // Left
    const leftArrowContainer = document.getElementById('workshop-selection-list-left-arrow')
    let leftIconData = await getIconData('left-arrow')
    leftArrowContainer.innerHTML = leftIconData

    // Right
    const rightArrowContainer = document.getElementById('workshop-selection-list-right-arrow')
    let rightIconData = await getIconData('right-arrow')
    rightArrowContainer.innerHTML = rightIconData

    handleWorkshopSelectionArrows()
})