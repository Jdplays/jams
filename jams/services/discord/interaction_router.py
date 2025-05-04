from typing import Callable, Awaitable, Dict
import discord

InteractionHandler = Callable[[discord.Interaction, str], Awaitable[None]]

INTERACTION_HANDLERS: Dict[str, InteractionHandler] = {}

def register_handler(prefix:str):
    def wrapper(func:InteractionHandler):
        INTERACTION_HANDLERS[prefix] = func
        return func
    return wrapper

