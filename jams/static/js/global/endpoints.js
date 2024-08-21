// This is a script where all then endpoint calls will live to prevent duplication across scripts
export function getLocationsForEvent(eventId) {
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

export function getTimeslotsForEvent(eventId) {
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

export function getLocations() {
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

export function getTimeslots() {
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

export function getWorkshops(queryString = null) {
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

export function getSessionsForEvent(eventId) {
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

export function getDifficultyLevels() {
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

export function addWorkshopToSession(sessionId, workshopId, force = false) {
    return new Promise((resolve) => {
        const data = {
            'workshop_id': workshopId,
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

export function removeWorkshopFromSession(sessionId) {
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

export function addLocationToEvent(eventId, locationId, order) {
    return new Promise((resolve) => {
        const data = {
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

export function updateEventLocationOrder(eventId, eventLocationId, order) {
    return new Promise((resolve) => {
        const data = {
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

export function addTimeslotToEvent(eventId, timeslotId) {
    return new Promise((resolve) => {
        const data = {
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

export function removeLocationFromEvent(eventId, eventLocationId) {
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

export function removeTimeslotFromEvent(eventId, eventTimeslotId) {
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

export function getIconData(filename) {
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

export function verifyEventbriteApiToken(token) {
    return new Promise((resolve, reject) => {
        const data = {
            'private_token': token
        }

        $.ajax({
            url: `/backend/integrations/eventbrite/verify`,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (response) {
                resolve(response.verified)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getEventbriteUserOrganisations() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/organisations`,
            type: 'GET',
            success: function (response) {
                resolve(response.organisations)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(false)
            }
        });
    });
}


export function enableEventbriteIntegration(data) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/enable`,
            type: 'POST',
            data: data,
            contentType: 'application/json',
            success: function (response) {
                resolve(response)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function disableEventbriteIntegration() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/disable`,
            type: 'DELETE',
            success: function (response) {
                resolve(response)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getEventbriteIntegrationConfig() {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/config`,
            type: 'GET',
            success: function (response) {
                resolve(response.eventbrite_config)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(false)
            }
        });
    });
}

export function editEventbriteIntegrationConfig(data) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/config`,
            type: 'PATCH',
            data: data,
            contentType: 'application/json',
            success: function (response) {
                resolve(response.eventbrite_config)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(false)
            }
        });
    });
}