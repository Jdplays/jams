import { LiveEventStats } from "./endpoints_interfaces";
import { SSEManager } from "./sse_manager";

const baseURL = '/api/v1'

export function getLiveEventStats():SSEManager<LiveEventStats> {
    const url = `${baseURL}/stats/live/stream`

    const sse = new SSEManager<LiveEventStats>(url)
    sse.start()
    return sse
}