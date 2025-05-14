def get_app_config(app_type:str):
    if app_type == 'web':
        from .web import WebConfig
        return WebConfig()
    elif app_type == 'server':
        from .server import ServerConfig
        return ServerConfig()
    return ValueError(f'Unknown app type for config: {app_type}')