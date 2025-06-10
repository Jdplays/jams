import { editUser, getCurrentUserData } from "@global/endpoints";
import { User } from "@global/endpoints_interfaces";
import { animateElement, buildQueryString, errorToast, isDefined, validateTextInput } from "@global/helper";
import { QueryStringData } from "@global/interfaces";

let currentUserId:number

let firstNameInputValid:boolean = false
let lastNameInputValid:boolean = false
let dobInputValid:boolean = false

const queryData:Partial<QueryStringData> = {
    pre_induction_request: true
}
const queryString = buildQueryString(queryData)

async function populateForm() {
    const firstNameInput = document.getElementById('user-first-name') as HTMLInputElement
    const lastNameInput = document.getElementById('user-last-name') as HTMLInputElement
    const dobInput = document.getElementById('user-dob') as HTMLInputElement

    
    const userData = await getCurrentUserData(queryString)

    firstNameInput.value = userData.first_name !== undefined ? userData.first_name : ""
    lastNameInput.value = userData.last_name !== undefined ? userData.last_name : ""
    dobInput.value = userData.dob !== undefined ? userData.dob : ""

    currentUserId = userData.id
}

function finishFormOnClick() {
    const finishButton = document.getElementById('finish-button') as HTMLAnchorElement

    const firstNameInput = document.getElementById('user-first-name') as HTMLInputElement
    const lastNameInput = document.getElementById('user-last-name') as HTMLInputElement
    const dobInput = document.getElementById('user-dob') as HTMLInputElement

    firstNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    lastNameInput.dispatchEvent(new Event('input', { bubbles: true }))
    dobInput.dispatchEvent(new Event('input', { bubbles: true }))

    if (!firstNameInputValid || !lastNameInputValid || !dobInputValid) {
        animateElement(finishButton, 'element-shake')
    }

    if (validateTextInput(firstNameInput) && validateTextInput(lastNameInput) && validateTextInput(dobInput)) {
        const data:Partial<User> = {
            first_name: firstNameInput.value.trim(),
            last_name: lastNameInput.value.trim(),
            dob: dobInput.value,
            user_induction: true
        }

        editUser(currentUserId, data, queryString).then(() => {
            window.location.reload()
        }).catch((error) => {
            const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
            errorToast(errorMessage)
        })
    }
}


document.addEventListener("DOMContentLoaded", populateForm)
document.addEventListener("DOMContentLoaded", () => {
    const finishButton = document.getElementById('finish-button') as HTMLAnchorElement
    finishButton.onclick = finishFormOnClick
})

document.addEventListener("DOMContentLoaded", () => {
    // Input Validation
    // First Name
    const userFirstNameInput = document.getElementById('user-first-name') as HTMLInputElement
    userFirstNameInput.oninput = async () => {
        firstNameInputValid = validateTextInput(userFirstNameInput)
    }

    // Last Description
    const userLastNameInput = document.getElementById('user-last-name') as HTMLInputElement
    userLastNameInput.oninput = async () => {
        lastNameInputValid = validateTextInput(userLastNameInput)
    }

    // DOB
    const userDOBInput = document.getElementById('user-dob') as HTMLInputElement
    userDOBInput.oninput = () => {
        dobInputValid = validateTextInput(userDOBInput)
    }
})

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).finishFormOnClick = finishFormOnClick;
    }
});