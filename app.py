## Run this is for DEV use

import threading
from time import sleep
from jams import create_app, scheduler
from websocket_server import WSS

app = create_app()

def run_jams(app):
    """Run JAMS app in a separate thread."""
    app.run(host='0.0.0.0', port=5000)

def run_websocket_server(app):
    """Run the websocket app in a separate thread."""
    WSS.run()

if __name__ == "__main__":
    try:
        flask_thread = threading.Thread(target=run_websocket_server, args=(app,))
        flask_thread.daemon = True  # Set thread as daemon so it exits when the main program exits
        flask_thread.start()

        sleep(3)

        print("Starting JAMS Web app...")
        flask_thread = threading.Thread(target=run_jams, args=(app,))
        flask_thread.daemon = True  # Set thread as daemon so it exits when the main program exits
        flask_thread.start()

        while True:
            sleep(1)
    except KeyboardInterrupt:
        print('Shutting Down...')
        print('Finishing running tasks... Please wait')
        if scheduler:
            scheduler.stop()