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

export interface Event {
    id:number
    name:string
    description:string
    date:string
    password:string
    active:boolean
}

export interface User {
    id:number
    username:string
    email:string
    first_name:string
    last_name:string
    display_name:string
    last_login:string
    role_ids:number[]
    dob:string
    bio:string
    active:boolean
}

export interface Role {
    id:number
    name:string
    description:string
    page_ids:number[]
    default:boolean
}

export interface Page {
    id:number
    name:string
    endpoint:string
    parent_id:number
    public:boolean
}

export interface PaginationResponseData {
    pagination_block_size:number
    pagination_start_index:number
    order_by:string
    order_direction:string
    pagination_total_records:number
}



export interface RequestMultiModelJSONData extends EventLocation, EventTimeslot, Location, Timeslot, Workshop, Session, DifficultyLevel, Event, User, Role, Page{
    force?:boolean
}

type SingularOrArray<T> = T | T[];
type TransformToSingularOrArray<T> = {
    [K in keyof T]: SingularOrArray<T[K]>;
};

export interface QueryStringData extends 
    TransformToSingularOrArray<EventLocation>,
    TransformToSingularOrArray<EventTimeslot>,
    TransformToSingularOrArray<Location>,
    TransformToSingularOrArray<Timeslot>,
    TransformToSingularOrArray<Workshop>,
    TransformToSingularOrArray<Session>,
    TransformToSingularOrArray<DifficultyLevel>,
    TransformToSingularOrArray<Event>,
    TransformToSingularOrArray<User>,
    TransformToSingularOrArray<Role>,
    TransformToSingularOrArray<Page> {
        $pagination_block_size?:number
        $pagination_start_index?:number
        $order_by?:string
        $order_direction?:string
    }

export interface BackendMultiEntryResponse<T> {
    pagination:PaginationResponseData
    data:T
}