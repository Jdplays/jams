export interface EventLocation {
    id:number
    event_id:number
    location_id:number
    order:number
    hidden:boolean
}

export interface EventTimeslot {
    id:number
    event_id:number
    timeslot_id:number
    hidden:boolean
}

export interface Location {
    id:number
    name:string
    active:boolean
}

export interface Timeslot {
    id:number
    name:string
    start:string
    end:string
    range:string
    active:boolean
}

export interface Workshop {
    id:number
    name:string
    description:string
    min_volunteers:number
    difficulty_id:number
    active:boolean
}

export interface Session {
    id:number
    event_id:number
    event_location_id:number
    event_timeslot_id:number
    workshop_id:number
    has_workshop:boolean
    location_column_order:number
    active:boolean
}

export interface DifficultyLevel {
    id:number
    name:string
    display_colour:string
}

export interface RequestJSONData extends Session, EventLocation, EventTimeslot{
    force:boolean
}