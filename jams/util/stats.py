from statistics import mean
from sqlalchemy import case, cast, Integer, literal, func, text, and_, exists, select
from sqlalchemy.orm import aliased
from datetime import datetime, timedelta, UTC
from jams.models import db, Attendee, AttendeeCheckInLog, EventStats, Event, Session, AttendeeSignup
from jams.util import helper

def get_live_event_stats(event_id, type):
    # Checked in count vs Total attendees
    # A checkin trend chart
    # Reentry rate

    checked_in_count = Attendee.query.filter_by(event_id=event_id, checked_in=True).count()
    total_count = Attendee.query.filter_by(event_id=event_id).count()
    total_checked_in_attendees = get_total_checked_in_attendees(event_id)
    check_in_trend = get_check_in_trend(event_id)

    timezoned_check_in_trend = convert_check_in_trend_to_Local_timezone(check_in_trend)

    if type == 'POST':
        return {
        'type': type,
        'event_id': event_id
        }

    return {
        'type': type,
        'event_id': event_id,
        'total_registered': total_count,
        'total_checked_in': total_checked_in_attendees,
        'current_checked_in': checked_in_count,
        'check_in_trend': timezoned_check_in_trend
    }


def get_check_in_trend(event_id, interval_minutes=10):
    rounded_time = (
        func.date_trunc('minute', AttendeeCheckInLog.timestamp) -
        cast(
            (cast(func.extract('minute', AttendeeCheckInLog.timestamp), Integer) % interval_minutes),
            Integer
        ) * text("INTERVAL '1 minute'")
    )

    checkin_subquery = (
        db.session.query(
            AttendeeCheckInLog.attendee_id,
            rounded_time.label('timestamp'),
            literal(1).label('action')  # 1 for check-in
        )
        .filter(AttendeeCheckInLog.event_id == event_id, AttendeeCheckInLog.checked_in == True)
        .group_by(AttendeeCheckInLog.attendee_id, rounded_time)
    )

    checkout_subquery = (
        db.session.query(
            AttendeeCheckInLog.attendee_id,
            rounded_time.label('timestamp'),
            literal(-1).label('action')  # -1 for checkout
        )
        .filter(AttendeeCheckInLog.event_id == event_id, AttendeeCheckInLog.checked_in == False)
        .group_by(AttendeeCheckInLog.attendee_id, rounded_time)
    )

    union_query = checkin_subquery.union_all(checkout_subquery).subquery()

    trend_data = (
        db.session.query(
            union_query.c.timestamp,
            func.sum(case((union_query.c.action == 1, 1), else_=0)).label('checkins'),
            func.sum(case((union_query.c.action == -1, 1), else_=0)).label('checkouts')
        )
        .group_by(union_query.c.timestamp)
        .order_by(union_query.c.timestamp)
        .all()
    )

    result = [{'timestamp': row.timestamp.strftime("%H:%M"), 'checkins': row.checkins, 'checkouts': row.checkouts} for row in trend_data]

    return result

def get_total_checked_in_attendees(event_id):
    total_checked_in = (
        db.session.query(func.count(func.distinct(AttendeeCheckInLog.attendee_id)))
        .filter(AttendeeCheckInLog.event_id == event_id, AttendeeCheckInLog.checked_in == True)
        .scalar()
    )

    return  total_checked_in

def get_post_event_stats(event_id):
    stats = EventStats.query.filter_by(event_id=event_id).first_or_404()
    
    return stats.to_dict()

def convert_check_in_trend_to_Local_timezone(check_in_trend):
    for trend_slot in check_in_trend:
        timestamp_str = trend_slot['timestamp']
        parsed_time = datetime.strptime(timestamp_str, "%H:%M").time()
        new_timestamp = helper.convert_time_to_local_timezone(parsed_time)
        trend_slot['timestamp'] = str(new_timestamp)
    
    return check_in_trend

def get_unique_checkin_outs(event_id):
    checkin_logs = AttendeeCheckInLog.query.filter_by(event_id=event_id).all()

    earliest_checkins = {}
    latest_checkouts = {}

    for log in checkin_logs:
        if log.checked_in:
            earliest_checkins[log.attendee_id] = min(earliest_checkins.get(log.attendee_id, log.timestamp), log.timestamp)
        else:
            latest_checkouts[log.attendee_id] = max(latest_checkouts.get(log.attendee_id, log.timestamp), log.timestamp)

    return (earliest_checkins, latest_checkouts)

def get_average_leave_time(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    
    default_checkout_time = event.end_date_time

    earliest_checkins, latest_checkouts = get_unique_checkin_outs(event_id)

    final_checkouts = {
        attendee_id: checkout_time
        for attendee_id, checkout_time in latest_checkouts.items()
    }

    for attendee_id in earliest_checkins.keys():
        if attendee_id not in latest_checkouts.keys():
            final_checkouts[attendee_id] = default_checkout_time

    checkout_times = [co.timestamp() for co in final_checkouts.values()]
    checkout_times.append(default_checkout_time.timestamp())

    avg_checkout_timestamp = mean(checkout_times)
    avg_checkout_datetime = datetime.fromtimestamp(avg_checkout_timestamp)
    localised_datetime = helper.convert_datetime_to_local_timezone(avg_checkout_datetime)
    return localised_datetime


def get_average_duration(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    
    default_checkout_time = event.end_date_time

    earliest_checkins, latest_checkouts = get_unique_checkin_outs(event_id)
    durations = []
    for attendee_id, checkin_time in earliest_checkins.items():
        checkout_time = latest_checkouts.get(attendee_id, default_checkout_time)
        
        duration = checkout_time.timestamp() - checkin_time.timestamp()
        durations.append(duration)
    
    avg_duration = mean(durations)
    return avg_duration


def get_gender_distribution(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    gender_labels_response = db.session.query(Attendee.gender).filter(Attendee.event_id == event_id).distinct().all()
    gender_labels = [g[0] for g in gender_labels_response]
    
    distribution = {}
    for label in gender_labels:
        count = Attendee.query.filter(Attendee.event_id == event_id, Attendee.gender == label).count()
        distribution[label] = count

    return distribution

def get_age_distribution(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    base_query = Attendee.query.filter(Attendee.event_id == event_id)

    under_five_count = base_query.filter(Attendee.age <= 5).count()
    six_to_ten_count = base_query.filter(Attendee.age >= 6, Attendee.age <= 10).count()
    eleven_to_fifteen = base_query.filter(Attendee.age >= 11, Attendee.age <= 15).count()
    sixteen_to_eighteen_count = base_query.filter(Attendee.age >= 16, Attendee.age <= 18).count()
    over_eighteen_count = base_query.filter(Attendee.age >= 18).count()

    return {
        '5-': under_five_count,
        '6-10': six_to_ten_count,
        '11-15': eleven_to_fifteen,
        '16-18': sixteen_to_eighteen_count,
        '18+': over_eighteen_count
    }


def calculate_retention_rate(event_id, grace_threshold=0.9, min_threshold=0.5):
    event = Event.query.filter_by(id=event_id).first_or_404()
    event_start = event.start_date_time
    event_end = event.end_date_time
    event_duration = event_end.timestamp() - event_start.timestamp()

    earliest_checkins, latest_checkouts = get_unique_checkin_outs(event_id)

    attendance_durations = [latest_checkouts.get(i, event_end).timestamp() - earliest_checkins[i].timestamp() for i in earliest_checkins.keys()]

    if not attendance_durations or event_duration <= 0:
        return 0.0
    
    retention_scores = []
    for time_attendeed in attendance_durations:
        retention = time_attendeed / event_duration

        if retention >= grace_threshold:
            retention = 1.0
        elif retention < min_threshold:
            retention *= 0.5
        
        retention_scores.append(retention * 100)
    
    return round(mean(retention_scores), 1)


def calculate_workshop_popularity(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    sessions_in_event = Session.query.filter(Session.event_id == event_id).all()
    workshops_raw_data = []
    for session in sessions_in_event:
        if not session.has_workshop:
            continue

        if session.workshop.attendee_registration:
            signup_count = AttendeeSignup.query.filter(AttendeeSignup.session_id == session.id).count()
            workshops_raw_data.append({
                'id': session.workshop.id,
                'name': session.workshop.name,
                'capacity': session.capacity,
                'signups': signup_count
            })

    for ws in workshops_raw_data:
        if ws['capacity'] > 0:
            ws['signup_ratio'] = ws['signups'] / ws['capacity']
        else:
            ws['signup_ratio'] = 0
    
    signup_ratios = [w['signup_ratio'] for w in workshops_raw_data]
    min_ratio = min(signup_ratios, default=0)
    max_ratio = max(signup_ratios, default=1)

    popularity_list = []
    for ws in workshops_raw_data:
        if max_ratio > min_ratio:
            normalised_popularity = (ws['signup_ratio'] - min_ratio) / (max_ratio - min_ratio)
        else:
            normalised_popularity = 0
        
        popularity_list.append({
            'id': ws['id'],
            'name': ws['name'],
            'score': round(normalised_popularity, 2)
        })
    
    return popularity_list

def calculate_workshop_dropout_rates(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    latest_checkouts = get_unique_checkin_outs(event_id)[1]
    sessions_in_event = Session.query.filter(Session.event_id == event_id).all()
    workshops_raw_data = []
    for session in sessions_in_event:
        if not session.has_workshop:
            continue

        if session.workshop.attendee_registration:
            signups = AttendeeSignup.query.filter(AttendeeSignup.session_id == session.id).all()
            droupout_count = sum(1 for signup in signups if signup.attendee_id in latest_checkouts)
            dropout_ratio = droupout_count / len(signups)
            workshops_raw_data.append({
                'id': session.workshop.id,
                'name': session.workshop.name,
                'dropout_ratio': dropout_ratio
            })
    
    dropout_ratios = [w['dropout_ratio'] for w in workshops_raw_data]
    min_ratio = min(dropout_ratios, default=0)
    max_ratio = max(dropout_ratios, default=1)

    dropout_list = []
    for ws in workshops_raw_data:
        if max_ratio > min_ratio:
            normalised_dropout_score = (ws['dropout_ratio'] - min_ratio) / (max_ratio - min_ratio)
        else:
            normalised_dropout_score = 0
        
        dropout_list.append({
            'id': ws['id'],
            'name': ws['name'],
            'score': round(normalised_dropout_score, 2)
        })
    
    return dropout_list
    

def calculate_workshop_overlap(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    sessions_in_event = Session.query.filter(Session.event_id == event_id).all()
    
    timeslots = {}
    locations = {}
    
    # Extract unique timeslots only from sessions that have workshops
    sorted_timeslots = sorted(
        {s.event_timeslot_id: s.event_timeslot.timeslot for s in sessions_in_event if s.has_workshop and s.workshop.attendee_registration}.values(),
        key=lambda ts: ts.start
    )

    # Assign sequential position IDs to timeslots
    for index, timeslot in enumerate(sorted_timeslots, start=1):  # Start indexing from 1
        timeslots[index] = timeslot.name  # Store ordered timeslot position

    # Extract unique locations while preserving order
    unique_locations = sorted(
        {session.location_column_order + 1: session.event_location.location.name 
        for session in sessions_in_event 
        if session.has_workshop and session.workshop.attendee_registration}.items()
    )

    # Assign a new sequential index starting from 1, while preserving the old order
    locations = {index + 1: loc_name for index, (_, loc_name) in enumerate(unique_locations)}

    workshop_overlaps = []
    
    # Group workshops by timestlot
    workshops_by_timeslot = {}
    for session in sessions_in_event:
        if session.has_workshop:
            timeslot_pos = next((k for k, v in timeslots.items() if v == session.event_timeslot.timeslot.name), None)
            location_pos = next((k for k, v in locations.items() if v == session.event_location.location.name), None)

            if timeslot_pos is not None and location_pos is not None:
                attendee_count = AttendeeSignup.query.filter(AttendeeSignup.event_id == event_id, AttendeeSignup.session_id == session.id).count()
                workshops_by_timeslot.setdefault(timeslot_pos, []).append({
                    'id': session.id,
                    'name': session.workshop.name,
                    'timeslot': timeslot_pos,
                    'location': location_pos,
                    'capacity': session.capacity,
                    'attendees': attendee_count,
                    'occupancy': attendee_count / session.capacity if session.capacity > 0 else 0
                })
    
    # Compute pull scores per workshop
    for timeslot, workshops in workshops_by_timeslot.items():
        for workshop in workshops:
            occupancy = workshop['occupancy']
            pull_score = occupancy * sum(1 - w['occupancy'] for w in workshops if w['id'] != workshop['id'])
            workshop['pull_score'] = round(pull_score, 3)
        
        # Normalise scores within the timeslot
        max_socre = max(w['pull_score'] for w in workshops) or 1
        print(f'Max: {max_socre}')
        for workshop in workshops:
            workshop['normalised_score'] = round(workshop['pull_score'] / max_socre, 2)
        
        workshop_overlaps.extend(workshops)
    
    return_obj = {
        'timeslots': timeslots,
        'locations': locations,
        'workshops': workshop_overlaps
    }

    return return_obj


