import { DifficultyLevel, EventLocation, EventTimeslot, RequestJSONData, Session, Location, Timeslot, Workshop } from "./endpoints_interfaces";

// This is a script where all then endpoint calls will live to prevent duplication across scripts
export function getLocationsForEvent(eventId:number):Promise<[EventLocation]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/events/${eventId}/locations`,
            type: 'GET',
            success: function (response) {
                resolve(response.event_locations)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

export function getTimeslotsForEvent(eventId:number):Promise<[EventTimeslot]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/events/${eventId}/timeslots`,
            type: 'GET',
            success: function (response) {
                resolve(response.event_timeslots)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getLocations():Promise<[Location]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/locations',
            type: 'GET',
            success: function (response) {
                resolve(response.locations)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getTimeslots():Promise<[Timeslot]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/timeslots',
            type: 'GET',
            success: function (response) {
                resolve(response.timeslots)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getWorkshops(queryString:string|null = null):Promise<[Workshop]> {
    return new Promise((resolve, reject) => {
        let url = "/backend/workshops"
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
            success: function (response) {
                resolve(response.workshops)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getSessionsForEvent(eventId:number):Promise<[Session]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/events/${eventId}/sessions`,
            type: 'GET',
            success: function (response) {
                resolve(response.sessions)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getDifficultyLevels():Promise<[DifficultyLevel]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/difficulty_levels',
            type: 'GET',
            success: function(response) {
                resolve(response.difficulty_levels);  
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function addWorkshopToSession(sessionId:number, workshopId:number, force:boolean = false):Promise<boolean> {
    return new Promise((resolve) => {
        const data:Partial<RequestJSONData> = {
            'workshop_id': workshopId
        }

        if (force) {
            data['force'] = force
        }

        $.ajax({
            url: `/backend/sessions/${sessionId}/workshop`,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

export function removeWorkshopFromSession(sessionId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            url: `/backend/sessions/${sessionId}/workshop`,
            type: 'DELETE',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

export function addLocationToEvent(eventId:number, locationId:number, order:number):Promise<boolean> {
    return new Promise((resolve) => {
        const data:Partial<RequestJSONData> = {
            'location_id': locationId,
            'order': order
        }
        $.ajax({
            url: `/backend/events/${eventId}/locations`,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

export function updateEventLocationOrder(eventId:number, eventLocationId:number, order:number):Promise<boolean> {
    return new Promise((resolve) => {
        const data:Partial<RequestJSONData> = {
            'order': order
        }

        $.ajax({
            url: `/backend/events/${eventId}/locations/${eventLocationId}/update_order`,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

export function addTimeslotToEvent(eventId:number, timeslotId:number):Promise<boolean> {
    return new Promise((resolve) => {
        const data:Partial<RequestJSONData> = {
            'timeslot_id': timeslotId
        }

        $.ajax({
            url: `/backend/events/${eventId}/timeslots`,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

export function removeLocationFromEvent(eventId:number, eventLocationId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            url: `/backend/events/${eventId}/locations/${eventLocationId}`,
            type: 'DELETE',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

export function removeTimeslotFromEvent(eventId:number, eventTimeslotId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            url: `/backend/events/${eventId}/timeslots/${eventTimeslotId}`,
            type: 'DELETE',
            success: function (response) {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

export function getIconData(filename:string):Promise<string> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/assets/icons/${filename}.svg`,
            type: 'GET',
            dataType: 'xml',
            success: function (response) {
                const svgContent = new XMLSerializer().serializeToString(response.documentElement);
                resolve(svgContent)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        })
    })
}