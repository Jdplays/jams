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