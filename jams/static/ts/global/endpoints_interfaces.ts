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
    has_files:boolean
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

export interface PrivateAccessLog {
    id:number
    url:string
    internal_endpoint:string
    user_id:number
    user_display_name:string
    username:string
    user_email:string
    user_role_names:string
    required_role_names:string
    status_code:string
    date_time:string
}

export interface VolunteerAttendance {
    id:number
    event_id:number
    user_id:number
    setup:boolean
    main:boolean
    packdown:boolean
    note:string
}

export interface WorkshopFile {
    id:number
    workshop_id:number
    file_id:string
    type:string
}

export interface FileData {
    uuid:string
    name:string
    bucket_name:string
    current_version_id:string
    public:boolean
}

export interface FileVersion {
    id:number
    file_id:string
    version_id:string
}

export interface FileResponse {
    data: Blob;
    mimeType: string | null;
  }

export interface PaginationResponseData {
    pagination_block_size:number
    pagination_start_index:number
    order_by:string
    order_direction:string
    pagination_total_records:number
}

export interface EventbriteIntegrationConfig {
    EVENTBRITE_ENABLED:boolean
    EVENTBRITE_BEARER_TOKEN:string
    EVENTBRITE_ORGANISATION_ID:string
    EVENTBRITE_ORGANISATION_NAME:string
}

export interface EventbriteOrganisation {
    id:string
    name:string
    image_id:string
    

}

export interface RequestMultiModelJSONData extends EventLocation, EventTimeslot, Location, Timeslot, Workshop, Session, DifficultyLevel, Event, User, Role, Page, PrivateAccessLog, VolunteerAttendance, WorkshopFile, FileData, FileVersion{
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
    TransformToSingularOrArray<Page>,
    TransformToSingularOrArray<PrivateAccessLog>,
    TransformToSingularOrArray<VolunteerAttendance>,
    TransformToSingularOrArray<WorkshopFile>,
    TransformToSingularOrArray<FileData>,
    TransformToSingularOrArray<FileVersion> {
        $pagination_block_size?:number
        $pagination_start_index?:number
        $order_by?:string
        $order_direction?:string
    }

export type QueryStringKey = keyof QueryStringData;

export interface BackendMultiEntryResponse<T> {
    pagination:PaginationResponseData
    data:T
}