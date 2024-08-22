import {
    DifficultyLevel,
    EventLocation,
    EventTimeslot,
    RequestMultiModelJSONData,
    Session,
    Location,
    Timeslot,
    Workshop,
    Event,
    User,
    Role,
    Page,
    QueryStringData
} from "./endpoints_interfaces";

// This is a script where all then endpoint calls will live to prevent duplication across scripts

// #region Event Locations
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

export function addLocationToEvent(eventId:number, locationId:number, order:number):Promise<boolean> {
    return new Promise((resolve) => {
        const data:Partial<RequestMultiModelJSONData> = {
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
        const data:Partial<RequestMultiModelJSONData> = {
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
// #endregion

// #region Locations
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
// #endregion

// #region Event Timeslots
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

export function addTimeslotToEvent(eventId:number, timeslotId:number):Promise<boolean> {
    return new Promise((resolve) => {
        const data:Partial<RequestMultiModelJSONData> = {
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
// #endregion

// #region Timeslots
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
// #endregion

// #region Workshops
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
// #endregion

// #region Sessions
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

export function addWorkshopToSession(sessionId:number, workshopId:number, force:boolean = false):Promise<boolean> {
    return new Promise((resolve) => {
        const data:Partial<RequestMultiModelJSONData> = {
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
// #endregion

// #region Difficulty Levels
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
// #endregion

// #region Events
export function getEvents():Promise<[Event]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events',
            type: 'GET',
            success: function(response) {
                resolve(response.events);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

export function getEventNames():Promise<[Partial<Event>]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/events/name',
            type: 'GET',
            success: function (response) {
                resolve(response.events)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

export function getEvent(eventID:number):Promise<Event> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/events/${eventID}`,
            type: 'GET',
            success: function(response) {
                resolve(response);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

export function addNewEvent(data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: '/backend/events',
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

export function editEvent(eventID:number, data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'PATCH',
            url: `/backend/events/${eventID}`,
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

export function archiveEvent(eventID:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/events/${eventID}/archive`,
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

export function activateEvent(eventID:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/events/${eventID}/activate`,
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
// #endregion

// #region Users
export function getCurrentUserId():Promise<number> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/get_current_user_id',
            type: 'GET',
            success: function(response) {
                resolve(response.current_user_id);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getUsers():Promise<[User]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/users',
            type: 'GET',
            success: function(response) {
                resolve(response.users);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getUserRoles(userId:number):Promise<Partial<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/users/${userId}/role_ids`,
            type: 'GET',
            success: function(response) {
                resolve(response);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function editUser(userId:number, data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'PATCH',
            url: `/backend/users/${userId}`,
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

export function archiveUser(userID:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/users/${userID}/archive`,
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

export function activateUser(userID:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/users/${userID}/activate`,
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
// #endregion

// #region Roles
export function getRoles():Promise<[Role]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/roles',
            type: 'GET',
            success: function(response) {
                resolve(response.roles);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

export function getRole(roleId:number):Promise<Role> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/roles/${roleId}`,
            type: 'GET',
            success: function(response) {
                resolve(response);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

export function getRoleNames(queryString:string=null):Promise<[Role]> {
    return new Promise((resolve, reject) => {
        let url = '/backend/roles/name'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                resolve(response.roles);
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function addNewRole(data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: '/backend/roles',
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

export function editRole(roleId:number, data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'PATCH',
            url: `/backend/roles/${roleId}`,
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

export function deleteRole(roleId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'DELETE',
            url: `/backend/roles/${roleId}`,
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
// #endregion

// #region Pages

// #endregion
export function getPageNames(queryString:string|null=null):Promise<[Partial<Page>]> {
    return new Promise((resolve, reject) => {
        let url = '/backend/pages/name'
        if (queryString != null) {
            url += `?${queryString}`
        }   
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                resolve(response.pages);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}
// #region Code Assets
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
// #endregion