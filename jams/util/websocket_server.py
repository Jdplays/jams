# This script contains the server code for the JOLT integration (JAMS Onsite Labeling Tool)

import asyncio
from collections import defaultdict
import json
import websockets
from urllib.parse import urlparse, parse_qs

from jams.util.enums import APIKeyType

class WebsocketServer:
    def __init__(self):
        self.connected_clients = defaultdict(list)
        self.loop = None
    
    def init_app(self, app):
        self.app = app
    
    # Adds a client to the connected clients dictionary
    def add_client(self, group, client):
        self.connected_clients[group].append(client)
    
    # Removes a client from the connected clients dictionary
    def remove_client(self, group, client):
        if client in self.connected_clients[group]:
            self.connected_clients[group].remove(client)

            # Remove the group if it is empty
            if not self.connected_clients[group]:
                del self.connected_clients[group]

    # Handles an websocket connections
    async def websocket_handler(self, websocket, path):
        from jams.util import helper
        query_params = parse_qs(urlparse(path).query)
        api_token = query_params.get('api_token', [None])[0]

        with self.app.app_context():
            if not helper.validate_api_key(api_token, require_websocket=True):
                await websocket.close(code=1008)
                print("Connection closed: invalid API Key")
                return

            print("WebSocket connection established with valid token")
            api_key_obj = helper.get_api_key_obj(api_token)
            self.add_client(api_key_obj.type, websocket)

            try:
                # Keep the connection open and do nothing (just listen)
                while True:
                    message = await websocket.recv()
                    self.process_incoming_message(api_key_obj.type, message)

                    from jams.models import db,  WebsocketLog
                    client_ip, client_port = websocket.remote_address

                    log = WebsocketLog(source_ip=client_ip, type=api_key_obj.type, api_key_id=api_key_obj.id, message=message)
                    db.session.add(log)
                    db.session.commit()

            except Exception as e:
                print(f"Error in websocket handler: {e}")
                await websocket.close(code=1008)
                self.remove_client(api_key_obj.type, websocket)
            finally:
                self.remove_client(api_key_obj.type, websocket)
                print("Client disconnected")
    
    # Internal method for sending a message to a specied group
    async def send_message_to_group(self, message, group):
        if self.connected_clients:
            await asyncio.gather(*[client.send(message) for client in self.connected_clients[group]])
        else:
            print("No clients are connected to receive the message.")

    # Public method to send message to a specified group
    def notify_clients(self, message, group):
        asyncio.create_task(self.send_message_to_group(message, group))

        from jams.models import db, WebsocketLog
        log = WebsocketLog(type=group, message=message)
        db.session.add(log)
        db.session.commit()

    # A loop on the websocket thread for any other service to use
    async def websocket_loop(self):
         from jams.integrations import jolt
         with self.app.app_context():
             while True:
                await asyncio.sleep(0.5)
                if len(self.connected_clients) <= 0:
                    continue
                
                try:
                    # Only do the JOLT loop if one of the connected clients is a JOLT client
                    if self.connected_clients[APIKeyType.JOLT.name]:
                        jolt.websocket_loop()
                except Exception as e:
                    print(f"Error in websocket Loop: {e}")
    
        
    # A function that processes incoming messages and route them depending on the group the client is in
    def process_incoming_message(self, group, message):
        from jams.integrations import jolt
        json_data = None
        try:
            json_data = json.loads(message)
        except Exception as e:
            print(f'Error loading JSON: {e}')
            return
        
        match group:
            case APIKeyType.JOLT.name:
                jolt.process_request(json_data)


    # The method that starts the websocket server
    def run(self):
        print('Starting Websocket Server...')
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        self.loop.run_until_complete(websockets.serve(self.websocket_handler, '0.0.0.0', 8002))
        self.loop.create_task(self.websocket_loop())
        self.loop.run_forever()
