## Run this is for DEV use

import subprocess
import sys
import os
import threading

def stream_output(process, label):
    for line in iter(process.stdout.readline, b''):
        print(f"[{label}] {line.decode().rstrip()}")

def run():
    env = os.environ.copy()
    env['JAMS_ENV'] = 'dev'

    server = subprocess.Popen([sys.executable, '-m', 'server'], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    web = subprocess.Popen([sys.executable, '-m', 'web'], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

    threading.Thread(target=stream_output, args=(server, "SERVER")).start()
    threading.Thread(target=stream_output, args=(web, "WEB")).start()

    try:
        print('JAMS dev environment started. Press Ctrl+C to stop.')
        server.wait()
        web.wait()
    except KeyboardInterrupt:
        print('\nStopping JAMS...')
        web.terminate()
        server.terminate()

if __name__ == '__main__':
    run()