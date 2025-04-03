import json
import sys
from functools import wraps
from flask import Response, stream_with_context, request
from jams.models import db

try:
    from gevent import sleep as smart_sleep
except ImportError:
    from time import sleep as smart_sleep

def sse_stream(fetch_data_func, *, detect_changes=True, sleep_interval=1):
    """
    Wraps an SSE generator with common logic:
    - Client disconnect detection
    - DB session cleanup
    - Error handling
    - Optional change detection
    """

    def client_disconnected():
        """Check if client has disconnected, compatible with Werkzeug and Gevent."""
        try:
            return request.environ.get('wsgi.input') and request.environ['wsgi.input'].closed
        except AttributeError:
            # Gevent's Body object doesn't support `.closed`
            return False
        
    @stream_with_context
    def generator():
        last_sent_data = None
        try:
            while True:
                # Detect client disconnect (works best in prod when using gevent)
                if client_disconnected():
                    print("Client disconnected")
                    break

                try:
                    current_data = fetch_data_func()

                    # Only send if data changed (if enabled)
                    if not detect_changes or current_data != last_sent_data:
                        last_sent_data = current_data
                        yield f"data: {json.dumps(current_data)}\n\n"
                        sys.stdout.flush()
                
                except Exception as e:
                    print(f"SSE loop error: {e}")
                
                finally:
                    db.session.remove()
                
                smart_sleep(sleep_interval)
        except GeneratorExit:
            print("Client disconnected (GeneratorExit)")
        except Exception as e:
            print(f"SSE error: {e}")
    return Response(
        generator(),
        content_type='text/event-stream',
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )