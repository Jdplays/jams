export class SSEManager<T> {
    private eventSource:EventSource | null = null
    private eventListener:Map<string, (data:T) => void> = new Map()
    private reconnectDelay = 5000

    constructor(private endpoint:string) {}

    public start():void {
        if (this.eventSource) {
            console.warn('SSE connection already open')
            return
        }

        this.eventSource = new EventSource(this.endpoint)
        this.eventSource.onmessage = (event) => {
            try {
                const parsedData:T = JSON.parse(event.data)
                this.notifyListeners(parsedData)
            } catch (error) {
                console.error('Error parsing SSE data: ', error)
            }
        }

        this.eventSource.onerror = () => {
            console.warn(`SSE connection lost. Reconnecting in ${this.reconnectDelay / 1000} seconds...`)
            this.stop()
            setTimeout(() => this.start(), this.reconnectDelay)
        }
    }

    public stop():void {
        console.log('Stopping SSE connection')
        if (this.eventSource) {
            this.eventSource.close()
            this.eventSource = null
        }
    }

    public onUpdate(callback:(data:T) => void):void {
        this.eventListener.set('update', callback)
    }

    private notifyListeners(data:T):void {
        const listener = this.eventListener.get('update')
        if (listener) listener(data)
    }
}