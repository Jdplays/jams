import { EventLocation, EventTimeslot, Session, Location, Timeslot, Workshop, Event, DifficultyLevel, User, Role, Page, VolunteerAttendance, PrivateAccessLog, WorkshopFile, FileData, FileVersion, VolunteerSignup, Attendee, AttendeeSignup } from "./endpoints_interfaces";

type SingularOrArray<T> = T | T[];
type TransformToSingularOrArray<T> = {
    [K in keyof T]: SingularOrArray<T[K]>;
};

export enum FireListEntryType {
    ATTENDEE = "ATTENDEE",
    VOLUNTEER = "VOLUNTEER",
    GUEST = "GUEST"
}

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
    TransformToSingularOrArray<VolunteerSignup>,
    TransformToSingularOrArray<WorkshopFile>,
    TransformToSingularOrArray<FileData>,
    TransformToSingularOrArray<FileVersion>,
    TransformToSingularOrArray<Attendee>,
    TransformToSingularOrArray<AttendeeSignup> {
        $pagination_block_size?:number
        $pagination_start_index?:number
        $order_by?:string
        $order_direction?:string
        $all_rows?:boolean
        pre_induction_request?:boolean
        inclusive?:boolean
    }

export type QueryStringKey = keyof QueryStringData;

export interface InputValidationPattern {
    pattern:RegExp
    errorMessage:string
    match?:boolean
}

export interface dateTimeFormatterOptions {
    isTime?:boolean
    includeDate?:boolean
    includeTime?:boolean
    includeSeconds?:boolean
}

export interface ScheduleGridTimeslotCapacity {
    capacity?:number
    overflow?:number
}

export interface GenderDistributionStat {
    male:number
    female:number
    other:number
}

export interface AgeDistributionStat {
    [key:string]:number
}

export interface CheckInTrendStat {
    timestamp:string
    checkins:number
    checkouts:number
}

export interface WorkshopPopularityStat {
    id:number
    name:string
    score:number
}

export interface WorkshopDropoutStat {
    id:number
    name:string
    score:number
}

export interface WorkshopOverlapWorkshop {
    id: number
    name:string
    timeslot:number
    location:number
    capacity:number
    attendees:number
    occupancy:number
    pull_score:number
    normalised_score:number
}

export interface WorkshopOverlapStat {
    timeslots:Record<number, string>
    locations:Record<number, string>
    workshops:WorkshopOverlapWorkshop[]
}
