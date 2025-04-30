import { AttendeeSignup, DiscordBotStartupResponse, DiscordGuild, LiveEventStats, Session, VolunteerSignup } from "./endpoints_interfaces";
import { buildQueryString } from "./helper";
import { QueryStringData } from "./interfaces";
import { SSEManager } from "./sse_manager";

const baseURL = '/api/v1'

export function getLiveEventStats():SSEManager<LiveEventStats> {
    const url = `${baseURL}/stats/live/stream`

    const sse = new SSEManager<LiveEventStats>(url)
    sse.start()
    return sse
}

export function getLiveEventSessions(eventId:number, queryData:any):SSEManager<[Session]> {
    const queryString = buildQueryString(queryData)
    const url = `${baseURL}/events/${eventId}/sessions/stream?${queryString}`

    const sse = new SSEManager<[Session]>(url)
    sse.start()
    return sse
}

export function getLiveVolunteerSignups(eventId:number):SSEManager<[VolunteerSignup]> {
    const url = `${baseURL}/events/${eventId}/volunteer_signups/stream`

    const sse = new SSEManager<[VolunteerSignup]>(url)
    sse.start()
    return sse
}

export function getLiveAttendeeSignups(eventId:number):SSEManager<[AttendeeSignup]> {
    const queryData:Partial<QueryStringData> = {
                '$all_rows': true,
                event_id: eventId,
            }
            const queryString = buildQueryString(queryData)
    const url = `${baseURL}/attendee/signups/stream?${queryString}`

    const sse = new SSEManager<[AttendeeSignup]>(url)
    sse.start()
    return sse
}

export function startupDiscordIntegrationGuildList():SSEManager<DiscordBotStartupResponse> {
    const url = `${baseURL}/integrations/discord/startup`

    const sse = new SSEManager<DiscordBotStartupResponse>(url)
    sse.start()
    return sse
}