import { getJoltStatus, sendJoltTestPrintRequest } from "@global/endpoints";
import { JOLTStatus } from "@global/endpoints_interfaces";
import { errorToast, isDefined, successToast } from "@global/helper";

let currentStatus:JOLTStatus = null
let widget:HTMLDivElement = null

async function populateJoltStatus() {
    const indicator = widget.querySelector('#indicator')
    const connectedText = widget.querySelector('#connected-text')
    const errorText = widget.querySelector('#error-text') as HTMLElement
    const cardBody = widget.querySelector('#card-body') as HTMLDivElement

    currentStatus = await getJoltStatus()
    

    // Reset indicator classes first
    indicator.classList.remove('status-red', 'status-green', 'status-orange', 'status-indicator-animated');
    errorText.style.display = 'none';

    if (currentStatus.online) {
        if (currentStatus.error) {
            indicator.classList.add('status-orange', 'status-indicator-animated');
            errorText.style.display = 'block';
            errorText.innerHTML = `ERROR: ${currentStatus.error}`
        } else {
            indicator.classList.add('status-green', 'status-indicator-animated');
        }

        connectedText.innerHTML = 'Connected';
        cardBody.classList.add('expanded');
        cardBody.style.height = `${cardBody.scrollHeight}px`;

        setTimeout(() => {
            cardBody.style.height = 'auto';
        }, 300);
    } else {
        indicator.classList.add('status-red');
        connectedText.innerHTML = 'Offline';
        cardBody.classList.remove('expanded');
        cardBody.style.height = '0';
    }

}

function secondsAgo(dateString: string): number {
    const givenDate = new Date(dateString)
    const currentDate = new Date()
    const differenceInMilliseconds = currentDate.getTime() - givenDate.getTime()
    return Math.floor(differenceInMilliseconds / 1000)
}

async function testPrintOnClick() {
    sendJoltTestPrintRequest().then((response) => {
        successToast(response)
    }).catch((error) => {
        const errorMessage = error.responseJSON ? error.responseJSON.message : 'An unknown error occurred';
        errorToast(errorMessage)
    })
}


// Event listeners
document.addEventListener("DOMContentLoaded", async function () {
    widget = document.getElementById('jolt-status-widget') as HTMLDivElement
    await populateJoltStatus()

    window.setInterval(() => {
        const lastCHeckedText = widget.querySelector('#last-checked-sub-header')
        const seconds = secondsAgo(currentStatus.date_time)
        lastCHeckedText.innerHTML = `Last Checked ${seconds} seconds ago`
    }, 1000)

    window.setInterval(async () => {
        await populateJoltStatus()
    }, 5000)
});

document.addEventListener("DOMContentLoaded", () => {
    if (isDefined(window)) {
        (<any>window).testPrintOnClick = testPrintOnClick;
    }
});