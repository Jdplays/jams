import json
import sys
from functools import wraps
from flask import Response, stream_with_context, request
from jams.models import db
import logging
logger = logging.getLogger(__name__)

try:
    from gevent import sleep as smart_sleep
except ImportError:
    from time import sleep as smart_sleep

active_sse_connections = 0


def sse_stream(fetch_data_func, *, detect_changes=True, sleep_interval=1):
    """
    Wraps an SSE generator with common logic:
    - Client disconnect detection
    - DB session cleanup
    - Error handling
    - Optional change detection
    """

    def client_disconnected(environ):
        """Check if the client has disconnected — Gevent-friendly."""
        try:
            input_stream = environ.get("wsgi.input")
            return hasattr(input_stream, "is_closed") and input_stream.is_closed()
        except Exception as e:
            logger.error(f"Error checking disconnect: {e}")
            return False
        
    @stream_with_context
    def generator():
        global active_sse_connections
        active_sse_connections += 1
        logger.error(f"🔌 SSE connected — total: {active_sse_connections}")
    
        last_sent_data = None
        environ = request.environ

        try:
            while True:
                # Detect client disconnect (works best in prod when using gevent)
                if client_disconnected(environ):
                    logger.error("Client disconnected")
                    break

                try:
                    current_data = fetch_data_func()

                    # Only send if data changed (if enabled)
                    if not detect_changes or current_data != last_sent_data:
                        last_sent_data = current_data
                        yield f"data: {json.dumps(current_data)}\n\n"
                        sys.stdout.flush()
                
                except Exception as e:
                    logger.error(f"SSE loop error: {e}")
                
                finally:
                    db.session.remove()
                
                smart_sleep(sleep_interval)
                yield ": keep-alive\n\n"

        except GeneratorExit:
            logger.error("Client disconnected (GeneratorExit)")
        except (ConnectionResetError, BrokenPipeError):
            logger.error("Client forcibly closed the connection")
        except Exception as e:
            logger.error(f"SSE error: {e}")
        finally:
            active_sse_connections -= 1
            logger.error(f"SSE cleaned up — remaining: {active_sse_connections}")
    return Response(
        generator(),
        content_type='text/event-stream',
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )