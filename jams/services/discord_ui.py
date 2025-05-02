import discord
from discord.ui import Modal, TextInput, Button, View, Select
from discord import TextStyle, ButtonStyle, Interaction

class RSVPSelect(Select):
    def __init__(self, message_db_id):
        options = [
            discord.SelectOption(label="Setup", value="setup"),
            discord.SelectOption(label="Main Event", value="main"),
            discord.SelectOption(label="Packdown", value="packdown"),
        ]

        super().__init__(
            placeholder="Add your attendance",
            min_values=1,
            max_values=3,
            options=options,
            custom_id=f'open_rsvp_modal:{message_db_id}' 
        )

        self.message_db_id = message_db_id

class RSVPView(View):
    def __init__(self, message_db_id, url):
        super().__init__(timeout=None)
        self.url = url
        self.message_db_id = message_db_id

        self.add_item(RSVPSelect(message_db_id))

        # Add the link button manually as link buttons cant use @button decorator
        self.add_item(Button(label='Open JAMS', style=ButtonStyle.link, url=url))


class RSVPModal(Modal, title='RSVP Form'):
    def __init__(self, url, message_db_id):
        super().__init__(timeout=None)
        self.url = url
        self.message_db_id = message_db_id

        self.notes = TextInput(label="Notes (optional)", style=TextStyle.paragraph, required=False)
        self.add_item(self.notes)

    async def on_submit(self, interaction: Interaction):
        view = View(timeout=None)
        view.add_item(Button(label='Update in JAMS', style=ButtonStyle.link, url=self.url))

        # Retrieve selection from memory
        from jams import DiscordBot
        selection = DiscordBot.pop_rsvp_selection(self.message_db_id)


        await interaction.response.edit_message(
            content=f"✅ You selected: {', '.join(selection)}\n📝 Notes: {self.notes.value}",
            view=view
        )