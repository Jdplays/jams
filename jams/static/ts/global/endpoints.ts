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
    BackendMultiEntryResponse,
    PrivateAccessLog,
    VolunteerAttendance,
    FileData,
    FileResponse,
    FileVersion,
    EventbriteIntegrationConfig,
    EventbriteOrganisation,
    EventbriteEvent,
    WorkshopType,
    AuthConfiguration,
    EditAuthConfigurationResponse,
    BackendResponse
} from "@global/endpoints_interfaces";

// This is a script where all then endpoint calls will live to prevent duplication across scripts

// #region Event Locations
export function getLocationsForEvent(eventId:number, queryString:string|null = null):Promise<[EventLocation]> {
    return new Promise((resolve, reject) => {
        let url = `/backend/events/${eventId}/locations`
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
            success: function (response) {
                resolve(response)
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
export function getLocations(queryString:string|null = null):Promise<BackendMultiEntryResponse<[Location]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/locations'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
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

export function getLocation(locationId:number):Promise<Location> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/locations/${locationId}`,
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

export function addLocation(data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: '/backend/locations',
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

export function editLocation(locationId:number, data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'PATCH',
            url: `/backend/locations/${locationId}`,
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

export function archiveLocation(locationId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/locations/${locationId}/archive`,
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

export function activateLocation(locationId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/locations/${locationId}/activate`,
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

// #region Event Timeslots
export function getTimeslotsForEvent(eventId:number, queryString:string|null = null):Promise<[EventTimeslot]> {
    return new Promise((resolve, reject) => {
        let url = `/backend/events/${eventId}/timeslots`
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
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
export function getTimeslots(queryString:string|null = null):Promise<BackendMultiEntryResponse<[Timeslot]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/timeslots'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
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

export function getTimeslot(timeslotId:number):Promise<Timeslot> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/timeslots/${timeslotId}`,
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

export function addTimeslot(data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: '/backend/timeslots',
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

export function editTimeslot(timeslotId:number, data:Partial<RequestMultiModelJSONData>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'PATCH',
            url: `/backend/timeslots/${timeslotId}`,
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

export function archiveTimeslot(timeslotId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/timeslots/${timeslotId}/archive`,
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

export function activateTimeslot(timeslotId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/timeslots/${timeslotId}/activate`,
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

// #region Workshops
export function getWorkshops(queryString:string|null = null):Promise<BackendMultiEntryResponse<[Workshop]>> {
    return new Promise((resolve, reject) => {
        let url = "/backend/workshops"
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
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

export function getWorkshopsField(field:string, queryString:string|null = null):Promise<BackendMultiEntryResponse<[Partial<Workshop>]>> {
    return new Promise((resolve, reject) => {
        let url = `/backend/workshops/${field}`
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
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

export function getWorkshop(workshopId:number):Promise<Workshop> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/workshops/${workshopId}`,
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

export function getWorkshopField(workshopId:number, field:string):Promise<Workshop> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/workshops/${workshopId}/${field}`,
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

export function addWorkshop(data:Partial<RequestMultiModelJSONData>):Promise<BackendResponse<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: '/backend/workshops',
            data: JSON.stringify(data),
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

export function editWorkshop(workshopId:number, data:Partial<RequestMultiModelJSONData>):Promise<BackendResponse<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'PATCH',
            url: `/backend/workshops/${workshopId}`,
            data: JSON.stringify(data),
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


export function archiveWorkshop(workshopId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/workshops/${workshopId}/archive`,
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

export function activateWorkshop(workshopId:number):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/workshops/${workshopId}/activate`,
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

export function getWorkshopFilesData(queryString:string|null = null):Promise<BackendMultiEntryResponse<[FileData]>> {
    return new Promise((resolve, reject) => {
        let url = "/backend/workshops/files"
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            type: 'GET',
            url: url,
            success: function(response) {
                resolve(response);   
            },
            error: function(error) {
                if (error.status === 404) {
                    resolve(null);
                } else {
                    console.log('Error fetching data:', error);
                    reject(error);
                }
            }
        });
    });
}

export function getFilesDataForWorkshop(workshopId:number, queryString:string|null = null):Promise<BackendMultiEntryResponse<[FileData]>> {
    return new Promise((resolve, reject) => {
        let url = `/backend/workshops/${workshopId}/files`
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            type: 'GET',
            url: url,
            success: function(response) {
                resolve(response);   
            },
            error: function(error) {
                if (error.status === 404) {
                    resolve(null);
                } else {
                    console.log('Error fetching data:', error);
                    reject(error);
                }
            }
        });
    });
}

export function getWorkshopFileData(workshopId:number, fileUUID:string):Promise<FileData> {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `/backend/workshops/${workshopId}/files/${fileUUID}/data`,
        type: "GET",
        success: function (response) {
          resolve(response);
        },
        error: function (error) {
          console.log("Error fetching data:", error);
          reject(error);
        },
      });
    });
  }

  export function editFileData(workshopId:number, fileUUID:string, data:Partial<FileData>):Promise<boolean> {
    return new Promise((resolve) => {
      $.ajax({
        url: `/backend/workshops/${workshopId}/files/${fileUUID}/data`,
        type: "PATCH",
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

export function uploadFileToWorkshop(workshopId:number, fileData:FormData):Promise<FileData> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `/backend/workshops/${workshopId}/files`,
            data: fileData,
            processData: false,
            contentType: false,
            success: function (response) {
                resolve(response.file_data)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function archiveWorkshopFile(workshopId:number, fileUUID:string):Promise<Boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/workshops/${workshopId}/files/${fileUUID}/archive`,
            success: function () {
                resolve(true)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                resolve(false)
            }
        });
    });
}

export function activateWorkshopFile(workshopId:number, fileUUID:string):Promise<Boolean> {
    return new Promise((resolve) => {
        $.ajax({
            type: 'POST',
            url: `/backend/workshops/${workshopId}/files/${fileUUID}/activate`,
            success: function () {
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

// #region Sessions
export function getSessionsForEvent(eventId:number, queryString:string|null = null):Promise<BackendMultiEntryResponse<[Session]>> {
    return new Promise((resolve, reject) => {
        let url = `/backend/events/${eventId}/sessions`
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
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
export function getDifficultyLevels():Promise<BackendMultiEntryResponse<[DifficultyLevel]>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/backend/difficulty_levels',
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

export function getDifficultyLevel(difficultyLevelId:number):Promise<DifficultyLevel> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/difficulty_levels/${difficultyLevelId}`,
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
// #endregion

// #region Workshop Types
export function getWorkshopTypes(queryString:string|null = null):Promise<BackendMultiEntryResponse<[WorkshopType]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/workshop_types'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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
// #endregion

// #region Events

export function getnextEvent(queryString:string|null = null):Promise<BackendResponse<number>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/get_next_event'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function getEvents(queryString:string|null = null):Promise<BackendMultiEntryResponse<[Event]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/events'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function getEventsField(field:string, queryString:string|null = null):Promise<BackendMultiEntryResponse<[Event]>> {
    return new Promise((resolve, reject) => {
        let url = `/backend/events/${field}`
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function getEventNames(queryString:string|null = null):Promise<BackendMultiEntryResponse<[Partial<Event>]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/events/name'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
            type: 'GET',
            success: function (response) {
                resolve(response)
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
export function getCurrentUserId(queryString:string|null=null):Promise<number> {
    return new Promise((resolve, reject) => {
        let url = '/backend/get_current_user_id'
        if (queryString) {
            url += `?${queryString}`
        } 
        $.ajax({
            url: url,
            type: 'GET',
            success: function(response) {
                resolve(Number(response.current_user_id));
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getCurrentUserData(queryString:string|null=null):Promise<User> {
    return new Promise((resolve, reject) => {
        let url = '/backend/get_current_user_data'
        if (queryString) {
            url += `?${queryString}`
        } 
        $.ajax({
            url: url,
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

export function getUsers(queryString:string|null = null):Promise<BackendMultiEntryResponse<[User]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/users'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function getUsersPublicInfo(queryString:string|null = null):Promise<BackendMultiEntryResponse<[Partial<User>]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/users/public_info'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function getUsersField(field:string, queryString:string|null = null):Promise<BackendMultiEntryResponse<[Partial<User>]>> {
    return new Promise((resolve, reject) => {
        let url = `/backend/users/${field}`
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function getUsersDisplayNames(queryString:string|null = null):Promise<BackendMultiEntryResponse<[Partial<User>]>> {
    return new Promise((resolve, reject) => {
        let url = `/backend/users/display_name`
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function editUser(userId:number, data:Partial<User>, queryString:string|null=null):Promise<BackendResponse<User>> {
    return new Promise((resolve, reject) => {
        let url = `/backend/users/${userId}`
        if (queryString) {
            url += `?${queryString}`
        } 
        $.ajax({
            type: 'PATCH',
            url: url,
            data: JSON.stringify(data),
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

export function archiveUser(userID:number):Promise<BackendResponse<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `/backend/users/${userID}/archive`,
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

export function activateUser(userID:number):Promise<BackendResponse<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `/backend/users/${userID}/activate`,
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
// #endregion

// #region Roles
export function getRoles(queryString:string|null = null):Promise<BackendMultiEntryResponse<[Role]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/roles'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function getRoleNames(queryString:string=null):Promise<BackendMultiEntryResponse<[Partial<Role>]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/roles/name'
        if (queryString != null) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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
export function getPageNames(queryString:string|null=null):Promise<BackendMultiEntryResponse<[Partial<Page>]>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/pages/name'
        if (queryString != null) {
            url += `?${queryString}`
        }   
        $.ajax({
            url: url,
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
// #endregion

// #region Audit
export function getPrivateAccessLogs(queryString:string|null=null):Promise<BackendMultiEntryResponse<PrivateAccessLog>> {
    return new Promise((resolve, reject) => {
        let url = '/backend/private_access_logs'
        if (queryString) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

// #endregion

// # region Volunteer Attendance

export function getAttendanceForEvent(eventID:number, queryString:string|null = null):Promise<BackendMultiEntryResponse<[VolunteerAttendance]>> {
    return new Promise((resolve, reject) => {
        let url = `/backend/events/${eventID}/volunteer_attendences`
        if (queryString) {
            url += `?${queryString}`
        }
        $.ajax({
            url: url,
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

export function getAttendanceForUser(userID:number, eventID:number):Promise<VolunteerAttendance> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/users/${userID}/volunteer_attendences/${eventID}`,
            type: 'GET',
            success: function(response) {
                resolve(response.volunteer_attendence);   
            },
            error: function(error) {
                console.log('Error fetching data:', error);
                reject(error);
            }
        });
    });
}

export function addAttendance(userID:number, eventID:number, data:Partial<VolunteerAttendance>):Promise<BackendResponse<VolunteerAttendance>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `/backend/users/${userID}/volunteer_attendences/${eventID}`,
            data: JSON.stringify(data),
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

export function editAttendance(userID:number, eventID:number, data:Partial<VolunteerAttendance>):Promise<BackendResponse<VolunteerAttendance>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'PATCH',
            url: `/backend/users/${userID}/volunteer_attendences/${eventID}`,
            data: JSON.stringify(data),
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
// #endregion

// #region Files
export function getFile(fileUUID:string, queryString:string|null = null):Promise<FileResponse> {
    return new Promise((resolve, reject) => {
        let url = `/resources/files/${fileUUID}`
        if (queryString) {
            url += `?${queryString}`
        }
        $.ajax({
            type: 'GET',
            url: url,
            xhrFields: {
                responseType: 'blob'
            },
            success: function(data, response, jqXHR) {
                const mimeType = jqXHR.getResponseHeader("Content-Type");
                resolve({data, mimeType});   
            },
            error: function (error) {
                console.log("Error fetching data:", error);
                reject(error);
            }
        });
    });
}

export function getFileVersions(fileUUID:string):Promise<[FileVersion]> {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: `/resources/files/${fileUUID}/versions`,
        type: "GET",
        success: function (response) {
          resolve(response.file_versions);
        },
        error: function (error) {
          console.log("Error fetching data:", error);
          reject(error);
        },
      });
    });
  }
// #endregion

// #region Eventbrite Integration
export function verifyEventbriteApiToken(token:string):Promise<boolean> {
    return new Promise((resolve) => {
        const data:Partial<EventbriteIntegrationConfig> = {
            'EVENTBRITE_BEARER_TOKEN': token
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
                resolve(false)
            }
        });
    });
}

export function getEventbriteUserOrganisations(token:string|null=null):Promise<[EventbriteOrganisation]> {
    return new Promise((resolve, reject) => {
        let data:Partial<EventbriteIntegrationConfig> = {}
        if (token) {
            data = {
                'EVENTBRITE_BEARER_TOKEN': token
            } 
        }
        $.ajax({
            url: `/backend/integrations/eventbrite/organisations`,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
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


export function enableEventbriteIntegration(data:Partial<EventbriteIntegrationConfig>):Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/enable`,
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

export function disableEventbriteIntegration():Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/disable`,
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

export function getEventbriteIntegrationConfig():Promise<EventbriteIntegrationConfig> {
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

export function editEventbriteIntegrationConfig(data:Partial<EventbriteIntegrationConfig>):Promise<EventbriteIntegrationConfig> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/config`,
            type: 'PATCH',
            data: JSON.stringify(data),
            contentType: 'application/json',
            success: function (response) {
                resolve(response.eventbrite_config)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(error)
            }
        });
    });
}

export function getEventbriteEvents():Promise<[EventbriteEvent]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/eventbrite/events`,
            type: 'GET',
            success: function (response) {
                resolve(response.events)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(false)
            }
        });
    });
}
// #endregion

// #region Auth Configuration

export function getAuthConfiguration():Promise<AuthConfiguration> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/auth/config`,
            type: 'GET',
            success: function (response) {
                resolve(response.auth_config)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(false)
            }
        });
    });
}

export function editAuthConfiguration(data:Partial<AuthConfiguration>):Promise<EditAuthConfigurationResponse> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `/backend/integrations/auth/config`,
            type: 'PATCH',
            data: JSON.stringify(data),
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

export function deleteOAuthConfiguration():Promise<boolean> {
    return new Promise((resolve) => {
        $.ajax({
            url: `/backend/integrations/auth/config`,
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