## Run this is for DEV use

import os
import subprocess
import sys
import threading
import time


def stream_output(process, label):
    for line in iter(process.stdout.readline, b''):
        print(f"[{label}] {line.decode().rstrip()}", flush=True)


def run():
    app_dir = os.path.dirname(os.path.abspath(__file__))

    env = os.environ.copy()
    env['JAMS_ENV'] = 'dev'
    env['PYTHONPATH'] = os.pathsep.join(
        path for path in [app_dir, env.get('PYTHONPATH')] if path
    )

    server = subprocess.Popen(
        [sys.executable, '-u', '-m', 'server'],
        env=env,
        cwd=app_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    web = subprocess.Popen(
        [sys.executable, '-u', '-m', 'web'],
        env=env,
        cwd=app_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    threading.Thread(target=stream_output, args=(server, "SERVER")).start()
    threading.Thread(target=stream_output, args=(web, "WEB")).start()

    try:
        print('JAMS dev environment started. Press Ctrl+C to stop.', flush=True)
        while True:
            server_code = server.poll()
            web_code = web.poll()

            if server_code is not None:
                print(f'SERVER exited with code {server_code}. Stopping JAMS...', flush=True)
                web.terminate()
                web.wait()
                return server_code

            if web_code is not None:
                print(f'WEB exited with code {web_code}. Stopping JAMS...', flush=True)
                server.terminate()
                server.wait()
                return web_code

            time.sleep(0.25)
    except KeyboardInterrupt:
        print('\nStopping JAMS...', flush=True)
        web.terminate()
        server.terminate()
        web.wait()
        server.wait()
        return 0


if __name__ == '__main__':
    raise SystemExit(run())
