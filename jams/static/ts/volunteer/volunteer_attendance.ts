import {
    getRoleNames,
    getUsersDisplayNames,
    getAttendanceForEvent,
    getAttendanceForVolunteer,
    addAttendance,
    editAttendance,
    getCurrentUserId
} from '@global/endpoints'
import { RequestMultiModelJSONData, VolunteerAttendance } from "@global/endpoints_interfaces";

let EventId = 1
let CurrentUserId = 0




async function addAttendanceOnClick(event:Event) {
    event.preventDefault()
    const data:Partial<RequestMultiModelJSONData> = {
        'setup': (document.getElementById('update-volunteer-attendance-setup') as HTMLInputElement).checked,
        'main': (document.getElementById('update-volunteer-attendance-main') as HTMLInputElement).checked,
        'packdown': (document.getElementById('update-volunteer-attendance-packdown') as HTMLInputElement).checked,
        'note': (document.getElementById('update-volunteer-attendance-note') as HTMLInputElement).value
    }

    const response = await addAttendance(CurrentUserId, EventId, data)
    if (response) {
        populateVolunteerAttendanceTable()
        populateUpdateForm()
    }
}

async function editAttendanceOnClick(event:Event) {
    event.preventDefault()
    const data:Partial<RequestMultiModelJSONData> = {
        'id': Number((document.getElementById('update-volunteer-attendance-id') as HTMLInputElement).value),
        'setup': (document.getElementById('update-volunteer-attendance-setup') as HTMLInputElement).checked,
        'main': (document.getElementById('update-volunteer-attendance-main') as HTMLInputElement).checked,
        'packdown': (document.getElementById('update-volunteer-attendance-packdown') as HTMLInputElement).checked,
        'note': (document.getElementById('update-volunteer-attendance-note') as HTMLInputElement).value
    }

    const response = await editAttendance(CurrentUserId, EventId, data)
    if (response) {
        populateVolunteerAttendanceTable()
    }
}

function createAndAppendCell(row:HTMLElement, content:any) {
    const cell = document.createElement('td');
    cell.innerHTML = content
    row.appendChild(cell)
}

async function populateVolunteerAttendanceTable() {
    const roleIdResponse = await getRoleNames('name=volunteer')
    let roleId = roleIdResponse.data[0].id

    const allVolunteersResponse = await getUsersDisplayNames(`role_ids=${roleId}`)
    let allVolunteers = allVolunteersResponse.data

    $('#volunteer-attendance-table tbody').empty();

    for (const volunteer of allVolunteers) {
        let attendance:VolunteerAttendance
        await getAttendanceForVolunteer(volunteer.id, EventId).then(att => {
            attendance = att
        }).catch(error => {
            console.log(error)
        })

        var row = document.createElement('tr')
        createAndAppendCell(row, volunteer.display_name)

        if (attendance == null) {
            createAndAppendCell(row, "No Data")
            createAndAppendCell(row, "No Data")
            createAndAppendCell(row, "No Data")
            createAndAppendCell(row, "No Data")
        }
        else
        {
            createAndAppendCell(row, attendance.setup)
            createAndAppendCell(row, attendance.main)
            createAndAppendCell(row, attendance.packdown)
            createAndAppendCell(row, attendance.note)
        }

        $('#volunteer-attendance-table').append(row)
    };
}

async function populateUpdateForm() {
    let loggedInUserID = await getCurrentUserId()
    CurrentUserId = loggedInUserID
    let loggedInUserAttendance:VolunteerAttendance;
    await getAttendanceForVolunteer(CurrentUserId, EventId).then(att => {
        loggedInUserAttendance = att
    }).catch(error => {
        console.log(error)
    })


    let updateAttendanceFormButton = document.getElementById('update-volunteer-attendance-submit')
    let updateAttendanceFormTitle = document.getElementById('update-volunteer-attendance-title')

    if (loggedInUserAttendance == null) {
        // User hasnt submitted attendance yet
        updateAttendanceFormButton.onclick = addAttendanceOnClick
        updateAttendanceFormTitle.innerHTML = 'Add Attendance'
    }
    else {
        updateAttendanceFormButton.onclick = editAttendanceOnClick
        updateAttendanceFormTitle.innerHTML = 'Update Attendance'

        const hiddenIdInput = (document.getElementById('update-volunteer-attendance-id') as HTMLInputElement)
        const setupInput = (document.getElementById('update-volunteer-attendance-setup') as HTMLInputElement)
        const mainInput = (document.getElementById('update-volunteer-attendance-main') as HTMLInputElement)
        const packdownInput = (document.getElementById('update-volunteer-attendance-packdown') as HTMLInputElement)
        const noteInput = (document.getElementById('update-volunteer-attendance-note') as HTMLInputElement)

        hiddenIdInput.value = String(CurrentUserId)
        setupInput.checked = Boolean(loggedInUserAttendance.setup)
        mainInput.checked = Boolean(loggedInUserAttendance.main)
        packdownInput.checked = Boolean(loggedInUserAttendance.packdown)
        noteInput.value = String(loggedInUserAttendance.note)
        
    }
}


document.addEventListener("DOMContentLoaded", populateVolunteerAttendanceTable);
document.addEventListener("DOMContentLoaded", populateUpdateForm);