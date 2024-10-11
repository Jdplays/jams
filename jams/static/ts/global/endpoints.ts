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
    ApiMultiEntryResponse,
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
    ApiResponse,
    VolunteerSignup,
    EventbriteTicketType,
    Metadata,
    WebhookLog,
    ExternalAPILog,
    TaskSchedulerLog,
    Attendee,
    AttendeeLogin,
    GeneralConfig
} from "@global/endpoints_interfaces";
import { formatDate } from "./helper";

// This is a script where all then endpoint calls will live to prevent duplication across scripts

const baseURL = '/api/v1'

// #region Event Locations
export function getLocationsForEvent(eventId:number, queryString:string|null = null):Promise<[EventLocation]> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/events/${eventId}/locations`
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
            url: `${baseURL}/events/${eventId}/locations`,
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
            url: `${baseURL}/events/${eventId}/locations/${eventLocationId}/update_order`,
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
            url: `${baseURL}/events/${eventId}/locations/${eventLocationId}`,
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
export function getLocations(queryString:string|null = null):Promise<ApiMultiEntryResponse<[Location]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/locations`
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
            url: `${baseURL}/locations/${locationId}`,
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
            url: `${baseURL}/locations`,
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
            url: `${baseURL}/locations/${locationId}`,
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
            url: `${baseURL}/locations/${locationId}/archive`,
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
            url: `${baseURL}/locations/${locationId}/activate`,
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
        let url = `${baseURL}/events/${eventId}/timeslots`
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
            url: `${baseURL}/events/${eventId}/timeslots`,
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
            url: `${baseURL}/events/${eventId}/timeslots/${eventTimeslotId}`,
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
export function getTimeslots(queryString:string|null = null):Promise<ApiMultiEntryResponse<[Timeslot]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/timeslots`
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
            url: `${baseURL}/timeslots/${timeslotId}`,
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
            url: `${baseURL}/timeslots`,
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
            url: `${baseURL}/timeslots/${timeslotId}`,
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
            url: `${baseURL}/timeslots/${timeslotId}/archive`,
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
            url: `${baseURL}/timeslots/${timeslotId}/activate`,
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
export function getWorkshops(queryString:string|null = null):Promise<ApiMultiEntryResponse<[Workshop]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/workshops`
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

export function getWorkshopsField(field:string, queryString:string|null = null):Promise<ApiMultiEntryResponse<[Partial<Workshop>]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/workshops/${field}`
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
            url: `${baseURL}/workshops/${workshopId}`,
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
            url: `${baseURL}/workshops/${workshopId}/${field}`,
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

export function addWorkshop(data:Partial<RequestMultiModelJSONData>):Promise<ApiResponse<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${baseURL}/workshops`,
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

export function editWorkshop(workshopId:number, data:Partial<RequestMultiModelJSONData>):Promise<ApiResponse<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'PATCH',
            url: `${baseURL}/workshops/${workshopId}`,
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
            url: `${baseURL}/workshops/${workshopId}/archive`,
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
            url: `${baseURL}/workshops/${workshopId}/activate`,
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

export function getWorkshopFilesData(queryString:string|null = null):Promise<ApiMultiEntryResponse<[FileData]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/workshops/files`
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

export function getFilesDataForWorkshop(workshopId:number, queryString:string|null = null):Promise<ApiMultiEntryResponse<[FileData]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/workshops/${workshopId}/files`
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
        url: `${baseURL}/workshops/${workshopId}/files/${fileUUID}/data`,
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
        url: `${baseURL}/workshops/${workshopId}/files/${fileUUID}/data`,
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
            url: `${baseURL}/workshops/${workshopId}/files`,
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
            url: `${baseURL}/workshops/${workshopId}/files/${fileUUID}/archive`,
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
            url: `${baseURL}/workshops/${workshopId}/files/${fileUUID}/activate`,
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
export function getSessionsForEvent(eventId:number, queryString:string|null = null):Promise<ApiMultiEntryResponse<[Session]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/events/${eventId}/sessions`
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
            url: `${baseURL}/sessions/${sessionId}/workshop`,
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
            url: `${baseURL}/sessions/${sessionId}/workshop`,
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
export function getDifficultyLevels(queryString:string|null = null):Promise<ApiMultiEntryResponse<[DifficultyLevel]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/difficulty_levels`
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

export function getDifficultyLevel(difficultyLevelId:number):Promise<DifficultyLevel> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${baseURL}/difficulty_levels/${difficultyLevelId}`,
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
export function getWorkshopTypes(queryString:string|null = null):Promise<ApiMultiEntryResponse<[WorkshopType]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/workshop_types`
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

export function getnextEvent(queryString:string|null = null):Promise<ApiResponse<number>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/get_next_event`
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

export function getEvents(queryString:string|null = null):Promise<ApiMultiEntryResponse<[Event]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/events`
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

export function getEventsField(field:string, queryString:string|null = null):Promise<ApiMultiEntryResponse<[Partial<Event>]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/events/${field}`
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

export function getEvent(eventID:number):Promise<Event> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${baseURL}/events/${eventID}`,
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

export function getEventField(eventID:number, field:string):Promise<Partial<Event>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${baseURL}/events/${eventID}/${field}`,
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
            url: `${baseURL}/events`,
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
            url: `${baseURL}/events/${eventID}`,
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
            url: `${baseURL}/events/${eventID}/archive`,
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
            url: `${baseURL}/events/${eventID}/activate`,
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
        let url = `${baseURL}/get_current_user_id`
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
        let url = `${baseURL}/get_current_user_data`
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

export function getUsers(queryString:string|null = null):Promise<ApiMultiEntryResponse<[User]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/users`
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

export function getUsersPublicInfo(queryString:string|null = null):Promise<ApiMultiEntryResponse<[Partial<User>]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/users/public_info`
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

export function getUsersField(field:string, queryString:string|null = null):Promise<ApiMultiEntryResponse<[Partial<User>]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/users/${field}`
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

export function getUsersDisplayNames(queryString:string|null = null):Promise<ApiMultiEntryResponse<[Partial<User>]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/users/display_name`
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
            url: `${baseURL}/users/${userId}/role_ids`,
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

export function editUser(userId:number, data:Partial<User>, queryString:string|null=null):Promise<ApiResponse<User>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/users/${userId}`
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

export function archiveUser(userID:number):Promise<ApiResponse<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${baseURL}/users/${userID}/archive`,
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

export function activateUser(userID:number):Promise<ApiResponse<User>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${baseURL}/users/${userID}/activate`,
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
export function getRoles(queryString:string|null = null):Promise<ApiMultiEntryResponse<[Role]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/roles`
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
            url: `${baseURL}/roles/${roleId}`,
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

export function getRoleNames(queryString:string=null):Promise<ApiMultiEntryResponse<[Partial<Role>]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/roles/name`
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
            url: `${baseURL}/roles`,
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
            url: `${baseURL}/roles/${roleId}`,
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
            url: `${baseURL}/roles/${roleId}`,
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
export function getPageNames(queryString:string|null=null):Promise<ApiMultiEntryResponse<[Partial<Page>]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/pages/name`
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

// #region Logs
// Private access Log
export function getPrivateAccessLogs(queryString:string|null=null):Promise<ApiMultiEntryResponse<PrivateAccessLog>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/private_access_logs`
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

export function getPrivateAccessLogsMetadata():Promise<Partial<Metadata>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/private_access_logs/metadata`
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

// Task Scheduler Logs
export function getTaskSchedulerLogs(queryString:string|null=null):Promise<ApiMultiEntryResponse<TaskSchedulerLog>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/task_scheduler_logs`
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

export function getTaskSchedulerLogsMetadata():Promise<Partial<Metadata>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/task_scheduler_logs/metadata`
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

// Webhook Logs
export function getWebhookLogs(queryString:string|null=null):Promise<ApiMultiEntryResponse<WebhookLog>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/webhook_logs`
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

export function getWebhookLogsMetadata():Promise<Partial<Metadata>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/webhook_logs/metadata`
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

// External API Logs
export function getExternalApiLogs(queryString:string|null=null):Promise<ApiMultiEntryResponse<ExternalAPILog>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/external_api_logs`
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

export function getExternalApiLogsMetadata():Promise<Partial<Metadata>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/external_api_logs/metadata`
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

// #region Volunteer Attendance

export function getAttendanceForEvent(eventID:number, queryString:string|null = null):Promise<ApiMultiEntryResponse<[VolunteerAttendance]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/events/${eventID}/volunteer_attendences`
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
            url: `${baseURL}/users/${userID}/volunteer_attendences/${eventID}`,
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

export function addAttendance(userID:number, eventID:number, data:Partial<VolunteerAttendance>):Promise<ApiResponse<VolunteerAttendance>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${baseURL}/users/${userID}/volunteer_attendences/${eventID}`,
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

export function editAttendance(userID:number, eventID:number, data:Partial<VolunteerAttendance>):Promise<ApiResponse<VolunteerAttendance>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'PATCH',
            url: `${baseURL}/users/${userID}/volunteer_attendences/${eventID}`,
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

// #region

export function getVolunteerSignupsForEvent(eventID:number, queryString:string|null = null):Promise<ApiMultiEntryResponse<[VolunteerSignup]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/events/${eventID}/volunteer_signups`
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

export function getSignupsForUser(eventId:number, userId:number):Promise<ApiMultiEntryResponse<[VolunteerSignup]>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${baseURL}/events/${eventId}/volunteer_signups/${userId}`,
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

export function addVolunteerSignup(eventId:number, userId:number, data:Partial<VolunteerSignup>):Promise<ApiResponse<VolunteerSignup>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${baseURL}/events/${eventId}/volunteer_signups/${userId}`,
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

export function removeVolunteerSignup(eventId:number, userId:number, session_id:number):Promise<ApiResponse<VolunteerSignup>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'DELETE',
            url: `${baseURL}/events/${eventId}/volunteer_signups/${userId}/sessions/${session_id}`,
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

// #region Attendees Private

export function getAttendees(eventId:number, queryString:string|null = null):Promise<ApiMultiEntryResponse<[Attendee]>> {
    return new Promise((resolve, reject) => {
        let url = `${baseURL}/events/${eventId}/attendees`
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

export function addAttendee(eventId:number, data:Partial<Attendee>):Promise<ApiResponse<Attendee>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${baseURL}/events/${eventId}/attendees`,
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

export function editAttendee(eventId:number, attendeeId:number, data:Partial<Attendee>):Promise<ApiResponse<Attendee>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'PATCH',
            url: `${baseURL}/events/${eventId}/attendees/${attendeeId}`,
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

// #region Attendee Public

export function loginAttendee(data:Partial<AttendeeLogin>):Promise<ApiResponse<AttendeeLogin>> {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'POST',
            url: `${baseURL}/attendee/login`,
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

// @endregion

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
            url: `${baseURL}/integrations/eventbrite/verify`,
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
            url: `${baseURL}/integrations/eventbrite/organisations`,
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
            url: `${baseURL}/integrations/eventbrite/enable`,
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
            url: `${baseURL}/integrations/eventbrite/disable`,
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
            url: `${baseURL}/integrations/eventbrite/config`,
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
            url: `${baseURL}/integrations/eventbrite/config`,
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
            url: `${baseURL}/integrations/eventbrite/events`,
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

export function getEventbriteTicketTypes():Promise<[EventbriteTicketType]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${baseURL}/integrations/eventbrite/ticket_types`,
            type: 'GET',
            success: function (response) {
                resolve(response.ticket_types)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(false)
            }
        });
    });
}

export function getEventbriteCustomQuestions():Promise<[string]> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${baseURL}/integrations/eventbrite/custom_questions`,
            type: 'GET',
            success: function (response) {
                resolve(response.questions)
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
            url: `${baseURL}/integrations/auth/config`,
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
            url: `${baseURL}/integrations/auth/config`,
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
            url: `${baseURL}/integrations/auth/config`,
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

// #region Config

export function getGeneralConfig():Promise<GeneralConfig> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${baseURL}/app/config`,
            type: 'GET',
            success: function (response) {
                resolve(response.config)
            },
            error: function (error) {
                console.log('Error fetching data:', error);
                reject(false)
            }
        });
    });
}

export function editGeneralConfig(data:Partial<GeneralConfig>):Promise<GeneralConfig> {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${baseURL}/app/config`,
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