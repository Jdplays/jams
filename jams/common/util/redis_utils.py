from common.extensions import redis_client as client

def get_app_version(type='server'):
    if not type:
        return None
    return client.get(f'{type}:version')