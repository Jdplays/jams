import discord

from common.integrations.discord import get_params_for_message
from common.models import DiscordBotMessage
from common.util.helper import add_or_update_volunteer_attendance
from common.extensions import get_logger

from server.discord.interaction_router import register_handler
from server.discord.utils import store_rsvp_selection, pop_rsvp_selection
from server.discord import ui

logger = get_logger('DiscordBot')

@register_handler('open_rsvp_notes_modal')
async def handle_rsvp_modal(interaction:discord.Interaction, message_db_id:str):
    if interaction.data['custom_id'].startswith('open_rsvp_notes_modal_no'):
        selected_values = []
    else:
        selected_values = interaction.data.get("values", [])

    params = get_params_for_message(message_db_id)
    store_rsvp_selection(message_db_id, selected_values)
    await interaction.response.send_modal(ui.RSVPModal(message_db_id=message_db_id, **params))

@register_handler('rsvp_modal')
async def handle_rsvp_modal_submit(interaction:discord.Interaction, message_db_id:str):
    msg_obj = DiscordBotMessage.query.filter_by(id=message_db_id).first()
    if not msg_obj:
        logger.warning(f"[DiscordBot] Could not retrieve message {message_db_id} from the Database")
        return
    
    selection = pop_rsvp_selection(message_db_id)
    note = interaction.data["components"][0]["components"][0]["value"]

    # Acknowledge the modal submission so Discord doesn't timeout
    await interaction.response.defer(ephemeral=True)

    attending_setup = 'setup' in selection
    attending_main = 'main' in selection
    attending_packdown = 'packdown' in selection

    add_or_update_volunteer_attendance(
        user_id=msg_obj.user_id,
        event_id=msg_obj.event_id,
        setup=attending_setup,
        main=attending_main,
        packdown=attending_packdown,
        note=note
    )



    