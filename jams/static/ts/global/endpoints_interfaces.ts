export interface EventLocation {
    id:number
    event_id:number
    location_id:number
    order:number
    publicly_visible:boolean
}

export interface EventTimeslot {
    id:number
    event_id:number
    timeslot_id:number
    publicly_visible:boolean
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
    is_break:boolean
    active:boolean
}

export interface Workshop {
    id:number
    name:string
    description:string
    difficulty_id:number
    has_files:boolean
    active:boolean
    workshop_type_id:number
    volunteer_signup:boolean
    attendee_registration:boolean
    publicly_visible:boolean
    min_volunteers:number
    capacity:number
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

export interface WorkshopType {
    id:number
    name:string
    description:string
    volunteer_signup:boolean
    attendee_registration:boolean
    publicly_visible:boolean
    display_colour:string
}

export interface Event {
    id:number
    name:string
    description:string
    date:string
    start_time:string
    end_time:string
    password:string
    capacity:number
    active:boolean
    external:boolean
    external_id:string
    external_url:string
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
    user_induction:boolean
    avatar_url:string
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
    noReply?:boolean
}

export interface VolunteerSignup {
    id:number
    event_id:number
    user_id:number
    session_id:number
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

export interface EventbriteEvent {
    id:string
    name:string
    description:string
    date:string
    start_time:string
    end_time:string
    capacity:number
    url:string
}

export interface AuthConfiguration {
    LOCAL_AUTH_ENABLED:boolean
    OAUTH_ENABLED:boolean
    OAUTH_PROVIDER_NAME:string
    OAUTH_DISCOVERY_DOCUMENT_URL:string
    OAUTH_CLIENT_ID:string
    OAUTH_CLIENT_SECRET:string
}

export interface EditAuthConfigurationResponse {
    message:string
    config:AuthConfiguration
}

export interface RequestMultiModelJSONData extends EventLocation, EventTimeslot, Location, Timeslot, Workshop, Session, DifficultyLevel, Event, User, Role, Page, PrivateAccessLog, VolunteerAttendance, WorkshopFile, FileData, FileVersion{
    force?:boolean
}

export interface BackendResponse<T> {
    message:string
    data:T
}

export interface Metadata {
    setup_count?:number
    main_count?:number
    packdown_count?:number
}

export interface BackendMultiEntryResponse<T> {
    pagination:PaginationResponseData
    data:T
    metadata:Metadata
}