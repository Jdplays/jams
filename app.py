## Run this is for DEV use

import threading
import time
from jams import create_app, scheduler

app = create_app()

def run_flask(app):
    """Run Flask app in a separate thread."""
    app.run(host='0.0.0.0', port=5000)

if __name__ == "__main__":
    try:
        print("Starting JAMS Web app...")
        flask_thread = threading.Thread(target=run_flask, args=(app,))
        flask_thread.daemon = True  # Set thread as daemon so it exits when the main program exits
        flask_thread.start()

        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print('Shutting Down...')
        print('Finishing running tasks... Please wait')
        if scheduler:
            scheduler.stop()