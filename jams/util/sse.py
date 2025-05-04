import json
import sys
import copy
from flask import Response, stream_with_context, request
from jams.models import db
from jams import logger

try:
    from gevent import sleep as smart_sleep
except ImportError:
    logger.warn('Warning - Could not import Gevent Sleep, falling back to normal sleep')
    from time import sleep as smart_sleep


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
        logger.info("SSE connected")
    
        last_sent_data = None
        environ = request.environ

        try:
            while True:
                # Detect client disconnect (works best in prod when using gevent)
                if client_disconnected(environ):
                    logger.info("Client disconnected")
                    break

                try:
                    current_data = fetch_data_func()

                    # Only send if data changed (if enabled)
                    if not detect_changes or current_data != last_sent_data:
                        yield f"data: {json.dumps(current_data)}\n\n"
                        sys.stdout.flush()
                        last_sent_data = copy.deepcopy(current_data)
                
                except Exception as e:
                    logger.error(f"SSE loop error: {e}")
                
                finally:
                    db.session.remove()
                
                smart_sleep(sleep_interval)
                yield ": keep-alive\n\n"

        except GeneratorExit:
            logger.info("Client disconnected (GeneratorExit)")
        except (ConnectionResetError, BrokenPipeError):
            logger.error("Client forcibly closed the connection")
        except Exception as e:
            logger.error(f"SSE error: {e}")
        finally:
            logger.info(f"SSE cleaned up")
    return Response(
        generator(),
        content_type='text/event-stream',
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )