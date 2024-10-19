import { animateElement, errorToast, isDefined, successToast, validateTextInput } from "@global/helper";
import { InputValidationPattern } from "@global/interfaces";
import { AttendeeLogin } from "@global/endpoints_interfaces";
import { loginAttendee } from "@global/endpoints";

let emailOrderIdValid:boolean = false
let passwordValid:boolean = false

const emailRegex:RegExp = new RegExp(`^[\\w.-]+@([\\w-]+\\.)+[a-zA-Z]{2,4}$`, 'i')
const orderIdRegex:RegExp = new RegExp(`^[0-9]{4,30}$`, 'i')

function togglePasswordVisibility() {
    let passwordInput = document.getElementById('password-input') as HTMLInputElement
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text'
    } else {
        passwordInput.type = 'password'
    }
}

function attendeeLoginOnClcik() {
    const signInButton = document.getElementById('sign-in-button') as HTMLButtonElement

    const emailOrderIdInput = document.getElementById('email-order-id-input') as HTMLInputElement
    const emailInput = document.getElementById('email-input') as HTMLInputElement
    const passwordInput = document.getElementById('password-input') as HTMLInputElement

    if (emailOrderIdInput) {
        emailOrderIdInput.dispatchEvent(new Event('input', {bubbles: true}))
    }

    if (emailInput) {
        emailInput.dispatchEvent(new Event('input', {bubbles: true}))
    }

    passwordInput.dispatchEvent(new Event('input', {bubbles: true}))

    if (!emailOrderIdValid || !passwordValid) {
        animateElement(signInButton, 'element-shake')
        return
    }

    let email = null
    let orderId = null

    if (emailOrderIdInput) {
        if (emailRegex.test(emailOrderIdInput.value)) {
            email = emailOrderIdInput.value
        } else if (orderIdRegex.test(emailOrderIdInput.value)) {
            orderId = emailOrderIdInput.value
        }
    } else if (emailInput) {
        if (emailRegex.test(emailInput.value)) {
            email = emailInput.value
        }
    }

    const data:AttendeeLogin = {
        password: passwordInput.value
    }

    if (email !== null) {
        data.email = email
    } else if (orderId !== null) {
        data.order_id = orderId
    }

    // Do web request to login
    loginAttendee(data).then((response) => {
        successToast(response.message)
        window.location.reload()
    }).catch(error => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}



document.addEventListener("DOMContentLoaded", () => {
    // Form Validation
    // Email or Order ID
    const emailOrderIdInput = document.getElementById('email-order-id-input') as HTMLInputElement
    if (emailOrderIdInput) {
        emailOrderIdInput.oninput = async () => {
            let errorMessage = 'Please input a valid Email Address or Order ID'
            let patterns:InputValidationPattern[] = null
            patterns = [
                {pattern: emailRegex, errorMessage: errorMessage, match: true},
                {pattern: orderIdRegex, errorMessage: errorMessage, match: true}

            ]
            emailOrderIdValid = validateTextInput(emailOrderIdInput, patterns, true)
        }
    }

    // Email
    const emailInput = document.getElementById('email-input') as HTMLInputElement
    if (emailInput) {
        emailInput.oninput = async () => {
            let errorMessage = 'Please input a valid Email Address'
            let patterns:InputValidationPattern[] = null
            patterns = [
                {pattern: emailRegex, errorMessage: errorMessage, match: true}

            ]
            emailOrderIdValid = validateTextInput(emailInput, patterns, true)
        }
    }

    // Password
    const passwordInput = document.getElementById('password-input') as HTMLInputElement
    passwordInput.oninput = () => {
        passwordValid = validateTextInput(passwordInput, null, true)
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).togglePasswordVisibility = togglePasswordVisibility;
        (<any>window).attendeeLoginOnClcik = attendeeLoginOnClcik;
    }
});