import inspect
from jams.util.enums import DiscordMessageType, DiscordMessageView

# Discord temporary RSVP value store
_rsvp_selection_store = {}

def store_rsvp_selection(message_db_id, selection):
    _rsvp_selection_store[message_db_id] = selection

def pop_rsvp_selection(message_db_id):
    return _rsvp_selection_store.pop(message_db_id, [])

def send_or_update_latest_rsvp_reminder_to_confirm(volunteer_attendance):
    from jams import DiscordBot
    from jams.models import DiscordBotMessage
    from jams.util.helper import get_volunteer_attendance_url

    attending_setup = volunteer_attendance.setup
    attending_main = volunteer_attendance.main
    attending_packdown = volunteer_attendance.packdown

    if not attending_setup and not attending_main and not attending_packdown:
        new_message = '😞 No problem! Thanks for letting us know.'
    elif all([attending_setup, attending_main, attending_packdown]):
        new_message = '😃 Thats great news! Thank you.'
    elif attending_setup and not (attending_main and attending_packdown):
        new_message = '😃 Really appreciate the support before the Jam!'
    elif attending_packdown and not (attending_main and attending_setup):
        new_message = '😃 Really appreciate the support after the Jam!'
    elif attending_main and not (attending_setup and attending_packdown):
        new_message = '😃 Great, we\'ll see you there!'
    else:
        new_message = '✅ Thanks for filling in the form!' # More of a fallback

    full_message = f"**{new_message}**\nIf plans change, you can update your response any time on JAMS."

    latest_reminder = DiscordBotMessage.query.filter(
        DiscordBotMessage.user_id == volunteer_attendance.user_id,
        DiscordBotMessage.event_id == volunteer_attendance.event_id,
        DiscordBotMessage.message_type == DiscordMessageType.RSVP_REMINDER.name,
        DiscordBotMessage.active == True
    ).order_by(
        DiscordBotMessage.timestamp.desc()
    ).first()

    if latest_reminder:
        DiscordBot.update_dm_to_user(
            msg_obj=latest_reminder,
            new_content=full_message,
            new_view_type=DiscordMessageView.RSVP_COMPLETE_VIEW,
            new_message_type=DiscordMessageType.RSVP_COMPLETE
        )
    else:
        attendance_url = get_volunteer_attendance_url()
        DiscordBot.send_dm_to_user(
            user_id=volunteer_attendance.user_id,
            discord_user_id=volunteer_attendance.user.config.discord_account_id,
            message=full_message,
            message_type=DiscordMessageType.RSVP_COMPLETE,
            view_type=DiscordMessageView.RSVP_COMPLETE_VIEW,
            view_data={'url': attendance_url},
            event_id=volunteer_attendance.event_id

        )

def make_stub_view(view_class:type):
    sig = inspect.signature(view_class.__init__)
    kwargs = {}
    
    for name, param in sig.parameters.items():
        if name in ('self', 'args', 'kwargs'):
            continue
        kwargs[name] = 'placeholder'
    
    return view_class(**kwargs)