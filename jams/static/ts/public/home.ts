import { EventDetails, EventDetailsOptions } from "@global/event_details";


const eventDetailsOptions:EventDetailsOptions = {
    showEventSelection: false
}
let eventDetails:EventDetails;

document.addEventListener("DOMContentLoaded", async () => {
    eventDetails = new EventDetails('event-details', eventDetailsOptions)
    await eventDetails.init()
});