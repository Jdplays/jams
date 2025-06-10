// Event Schedule Page

import {
    getWorkshops,
    getIconData,
    getDifficultyLevels,
    getWorkshopTypes
} from '@global/endpoints'

import {
    buildQueryString,
    emptyElement
} from '@global/helper'

import { WorkshopCard, WorkshopCardOptions } from '@global/workshop_card'
import {ScheduleGrid, ScheduleGridOptions} from '@global/schedule_grid'
import TomSelect from 'tom-select';
import { QueryStringData } from '@global/interfaces';
import { EventDetails, EventDetailsOptions } from '@global/event_details';


// Variables
var selectDifficultyIds:number[] = []
var selectedTags:number[] = []
var currentSearchQuery:string = ''

// Event Details
const eventDetailsOptions:EventDetailsOptions = {
    eventDependentElements: [document.getElementById('workshop-selection-container'), document.getElementById('schedule-block')],
    eventOnChangeFunc: onEventChangeFunc
}
let eventDetails:EventDetails;

// Schedule Grid
const scheduleGridOptions:ScheduleGridOptions = {
    eventId: 1,
    edit: true,
    size: 200,
    showPrivate: true
}

let scheduleGrid:ScheduleGrid

// General Methods

// Handles the onchange event for the Event selction dropdown 
async function onEventChangeFunc() {
    if (scheduleGrid) {
        await scheduleGrid.changeEvent(eventDetails.eventId)
        checkForFatalGridError()
    } else {
        scheduleGridOptions.eventId = eventDetails.eventId
        scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)
        await scheduleGrid.init()

    }
}

// Workshop Selction
// Populates the list of workshop cards
async function populateWorkshopList() {
    let queryData:Partial<QueryStringData> = {
        name: currentSearchQuery,
        description: '$~name',
        $all_rows: true
    }

    if (selectDifficultyIds.length > 0) {
        queryData.difficulty_id = selectDifficultyIds
    }
    let queryString = buildQueryString(queryData)
    const workshopsResponse = await getWorkshops(queryString)
    const difficultyLevels = await getDifficultyLevels()
    const workshopTypes = await getWorkshopTypes()

    let workshops = workshopsResponse.data

    let workshopList = document.getElementById('workshop-selection-list')

    let elementList = []

    let cardOptions:WorkshopCardOptions = {
        width: 150,
        height: 150,
        difficultyLevels: difficultyLevels.data,
        workshopTypes: workshopTypes.data
    }

    // Populate the list
    for (const workshop of workshops) {
        const workshopListBlock = document.createElement('div')
        workshopListBlock.classList.add('workshop-list-block')
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
    difficultyOptions.classList.add('form-selectgroup')

    for (const level of difficultyLevels.data) {
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
    tagsTitle.innerText = 'Tags (WIP)'
    tagsContainer.appendChild(tagsTitle)

    let tagsSelect = document.createElement('select')
    tagsSelect.id = 'select-tags'
    tagsSelect.name = 'tags[]'
    tagsSelect.multiple = true

    // for(let i=0; i < 5; i++) {
    //     let option = document.createElement('option')
    //     option.value = String(i)
    //     option.text = 'tag ' + i
    //     tagsSelect.appendChild(option)
    // }

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

function checkForFatalGridError() {
    if (scheduleGrid.fatalError) {
        const workshopSelectionContainer = document.getElementById('workshop-selection-container')
        workshopSelectionContainer.style.display = 'none'
        return
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()

    populateWorkshopList()
    populateWorkshopSelectionTools()

    if (eventDetails.eventId === -1) {
        return
    }

    scheduleGridOptions.eventId = eventDetails.eventId

    scheduleGrid = new ScheduleGrid('schedule-container', scheduleGridOptions)
    await scheduleGrid.init()

    checkForFatalGridError()    
});

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