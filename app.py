## Run this is for DEV use

from jams import create_app, scheduler

app = create_app()

if __name__ == "__main__":
    try:
        app.run(host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print('Shutting Down...')
        if scheduler:
            scheduler.stop()