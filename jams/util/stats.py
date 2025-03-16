from collections import defaultdict
from statistics import mean
from sqlalchemy import case, cast, Integer, literal, func, text, and_, exists, select
from sqlalchemy.orm import aliased
from datetime import datetime, timedelta, UTC
from jams.models import db, Attendee, AttendeeCheckInLog, EventStats, Event, Session, AttendeeSignup
from jams.util import helper

def get_event_stats_mode():
    cur_event = helper.get_next_event()
    now = datetime.now(UTC)
    
    if not cur_event:
        last_event = Event.query.order_by(Event.date.desc()).first()
        return 'POST', last_event.id

    event_start = cur_event.start_date_time
    event_end = cur_event.end_date_time

    if event_start.tzinfo is None:
        event_start = event_start.replace(tzinfo=UTC)
    if event_end.tzinfo is None:
        event_end = event_end.replace(tzinfo=UTC)

    if event_start.date() == now.date() and now <= event_end + timedelta(hours=1):
        return 'LIVE', cur_event.id
    
    if now > event_end + timedelta(hours=1):
        post_event_id = cur_event.id
    else:
        last_event = Event.query.filter(Event.id != cur_event.id).order_by(Event.date.desc()).first()
        post_event_id = last_event.id if last_event else cur_event.id
    
    stats = EventStats.query.filter(EventStats.event_id == post_event_id).first()
    if not stats:
        return 'ERROR', post_event_id
    
    return 'POST', post_event_id

def get_live_event_stats(event_id, mode):
    # Checked in count vs Total attendees
    # A checkin trend chart
    # Reentry rate

    checked_in_count = Attendee.query.filter(Attendee.event_id == event_id, Attendee.checked_in == True).count()
    total_count = Attendee.query.filter_by(event_id=event_id).count()
    total_checked_in_attendees = calculate_total_checked_in_attendees(event_id)
    check_in_trend = calculate_check_in_trend(event_id)

    timezoned_check_in_trend = convert_check_in_trend_to_Local_timezone(check_in_trend)

    if mode == 'POST' or mode == 'ERROR':
        return {
        'mode': mode,
        'event_id': event_id
        }

    return {
        'mode': mode,
        'event_id': event_id,
        'total_registered': total_count,
        'total_checked_in': total_checked_in_attendees,
        'current_checked_in': checked_in_count,
        'check_in_trend': timezoned_check_in_trend
    }

def get_post_event_stats(event_id):
    stats = EventStats.query.filter_by(event_id=event_id).first_or_404()
    
    return stats.to_dict()


def calculate_check_in_trend(event_id, interval_minutes=10):
    event = Event.query.filter(Event.id == event_id).first()
    if not event:
        return []

    event_end_time = event.end_date_time

    # Retrieve all relevant check-in and check-out logs from the database
    logs = db.session.query(
        AttendeeCheckInLog.attendee_id,
        AttendeeCheckInLog.timestamp,
        AttendeeCheckInLog.checked_in
    ).filter(
        AttendeeCheckInLog.event_id == event_id,
        AttendeeCheckInLog.timestamp <= event_end_time  # Exclude anything after event ends
    ).all()

    # Process logs in Python
    trend_data = defaultdict(lambda: {"checkins": 0, "checkouts": 0})

    for log in logs:
        # Round timestamp to the nearest interval
        rounded_time = log.timestamp - timedelta(minutes=log.timestamp.minute % interval_minutes, seconds=log.timestamp.second, microseconds=log.timestamp.microsecond)
        rounded_time_str = rounded_time.strftime("%H:%M")  # Format for output
        
        if log.checked_in:
            trend_data[rounded_time_str]["checkins"] += 1
        else:
            trend_data[rounded_time_str]["checkouts"] += 1

    # Convert to sorted list of dictionaries
    result = [{"timestamp": time, "checkins": data["checkins"], "checkouts": data["checkouts"]} for time, data in sorted(trend_data.items())]
    return result

def calculate_total_checked_in_attendees(event_id):
    total_checked_in = (
        db.session.query(func.count(func.distinct(AttendeeCheckInLog.attendee_id)))
        .filter(AttendeeCheckInLog.event_id == event_id, AttendeeCheckInLog.checked_in == True)
        .scalar()
    )

    return  total_checked_in

def convert_check_in_trend_to_Local_timezone(check_in_trend):
    for trend_slot in check_in_trend:
        timestamp_str = trend_slot['timestamp']
        parsed_time = datetime.strptime(timestamp_str, "%H:%M").time()
        new_timestamp = helper.convert_time_to_local_timezone(parsed_time)
        trend_slot['timestamp'] = str(new_timestamp)
    
    return check_in_trend

def calculate_unique_checkin_outs(event_id):
    checkin_logs = AttendeeCheckInLog.query.filter_by(event_id=event_id).all()

    earliest_checkins = {}
    latest_checkouts = {}

    for log in checkin_logs:
        if log.checked_in:
            earliest_checkins[log.attendee_id] = min(earliest_checkins.get(log.attendee_id, log.timestamp), log.timestamp)
        else:
            latest_checkouts[log.attendee_id] = max(latest_checkouts.get(log.attendee_id, log.timestamp), log.timestamp)

    return (earliest_checkins, latest_checkouts)

def calculate_average_leave_time(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    
    default_checkout_time = event.end_date_time

    earliest_checkins, latest_checkouts = calculate_unique_checkin_outs(event_id)

    final_checkouts = {
        attendee_id: checkout_time
        for attendee_id, checkout_time in latest_checkouts.items()
    }

    for attendee_id in earliest_checkins.keys():
        if attendee_id not in latest_checkouts.keys():
            final_checkouts[attendee_id] = default_checkout_time

    checkout_times = [co.timestamp() for co in final_checkouts.values()]
    checkout_times.append(default_checkout_time.timestamp())

    if not checkout_times:
        return None
    
    avg_checkout_timestamp = mean(checkout_times)
    avg_checkout_datetime = datetime.fromtimestamp(avg_checkout_timestamp)
    localised_datetime = helper.convert_datetime_to_local_timezone(avg_checkout_datetime)
    return localised_datetime


def calculate_average_duration(event_id):
    event = Event.query.filter_by(id=event_id).first_or_404()
    
    default_checkout_time = event.end_date_time

    earliest_checkins, latest_checkouts = calculate_unique_checkin_outs(event_id)
    durations = []
    for attendee_id, checkin_time in earliest_checkins.items():
        checkout_time = latest_checkouts.get(attendee_id, default_checkout_time)
        
        duration = checkout_time.timestamp() - checkin_time.timestamp()
        durations.append(duration)

    if not durations:
        return None
    
    avg_duration = mean(durations)

    timedelta_duration = timedelta(seconds=avg_duration)
    return timedelta_duration


def calculate_gender_distribution(event_id):
    Event.query.filter_by(id=event_id).first_or_404()
    gender_labels_response = db.session.query(Attendee.gender).filter(Attendee.event_id == event_id).distinct().all()
    gender_labels = [g[0] for g in gender_labels_response]
    
    distribution = {}
    for label in gender_labels:
        count = Attendee.query.filter(Attendee.event_id == event_id, Attendee.gender == label).count()
        distribution[label] = count

    return distribution

def calculate_age_distribution(event_id):
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

    earliest_checkins, latest_checkouts = calculate_unique_checkin_outs(event_id)

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
    latest_checkouts = calculate_unique_checkin_outs(event_id)[1]
    sessions_in_event = Session.query.filter(Session.event_id == event_id).all()
    workshops_raw_data = []
    for session in sessions_in_event:
        if not session.has_workshop:
            continue

        if session.workshop.attendee_registration:
            signups = AttendeeSignup.query.filter(AttendeeSignup.session_id == session.id).all()
            droupout_count = sum(1 for signup in signups if signup.attendee_id in latest_checkouts)
            dropout_ratio = droupout_count / len(signups) if len(signups) > 0 else 0
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
        for workshop in workshops:
            workshop['normalised_score'] = round(workshop['pull_score'] / max_socre, 2)
        
        workshop_overlaps.extend(workshops)
    
    return_obj = {
        'timeslots': timeslots,
        'locations': locations,
        'workshops': workshop_overlaps
    }

    return return_obj


def generate_event_stats(event_id, update=False):
    stats = EventStats.query.filter(EventStats.event_id == event_id).first()
    if stats and not update:
        return # Only update stats if requested
    
    average_leave_time = calculate_average_leave_time(event_id)
    average_duration = calculate_average_duration(event_id)
    gender_distribution = calculate_gender_distribution(event_id)
    age_distribution = calculate_age_distribution(event_id)
    total_attendee_count = Attendee.query.filter_by(event_id=event_id).count()
    total_checked_in_count = calculate_total_checked_in_attendees(event_id)
    retention_rate = calculate_retention_rate(event_id)
    check_in_trend = calculate_check_in_trend(event_id)
    workshop_popularity = calculate_workshop_popularity(event_id)
    workshop_dropout_rates = calculate_workshop_dropout_rates(event_id)
    workshop_overlap = calculate_workshop_overlap(event_id)

    # Update existing stats if requested
    if stats and update:
        stats.total_registered = total_attendee_count
        stats.total_checked_in = total_checked_in_count
        stats.gender_distribution = gender_distribution
        stats.age_distribution = age_distribution
        stats.check_in_trend = check_in_trend
        stats.workshop_popularity = workshop_popularity
        stats.dropout_workshops = workshop_dropout_rates
        stats.workshop_overlap = workshop_overlap
        stats.average_leave_time = average_leave_time
        stats.average_duration = average_duration
        stats.retention_rate = retention_rate
        db.session.commit()
        return
    
    last_event = Event.query.filter(Event.id != event_id).order_by(Event.date.desc()).first()
    stats = EventStats(
        event_id=event_id,
        total_registered=total_attendee_count,
        total_checked_in=total_checked_in_count,
        gender_distribution=gender_distribution,
        age_distribution=age_distribution,
        check_in_trend=check_in_trend,
        workshop_popularity=workshop_popularity,
        dropout_workshops=workshop_dropout_rates,
        workshop_overlap=workshop_overlap,
        average_leave_time=average_leave_time,
        average_duration=average_duration,
        retention_rate=retention_rate,
        last_event_id=last_event.id
    )

    db.session.add(stats)
    db.session.commit()

