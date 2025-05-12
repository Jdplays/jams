from enum import Enum
import common.integrations.eventbrite as eventbrite
from common.util.enums import WebhookActionEnum




def execute_webhook(webhook, request_body):
    match webhook.action_enum:
        case WebhookActionEnum.EVENTBRITE_CHECK_IN.name:
            parts = trim_and_split_eventbrite_api_url(request_body.get('api_url'))
            update_attendee(webhook, parts[1], parts[3])
        case WebhookActionEnum.EVENTBRITE_CHECK_OUT.name:
            parts = trim_and_split_eventbrite_api_url(request_body.get('api_url'))
            update_attendee(webhook, parts[1], parts[3])


def trim_and_split_eventbrite_api_url(api_url):
    trimmed_url = api_url.replace('https://www.eventbriteapi.com/v3/', '')
    parts = trimmed_url.split('/')
    return parts

def update_attendee(webhook, event_id, attendee_id):
    try:
        data = eventbrite.get_attendee_data(event_id, attendee_id)
        eventbrite.update_or_add_attendee_from_data(data)
        webhook.log_success()
    except Exception as e:
        webhook.log(message=e, success=False)