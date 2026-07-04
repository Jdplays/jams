import json
import sys
import copy
from flask import Response, stream_with_context, request

from common.models import db
from common.extensions import get_logger, redis_client

logger = get_logger('web')

try:
    from gevent import sleep as smart_sleep
except ImportError:
    logger.warning('Warning - Could not import Gevent Sleep, falling back to normal sleep')
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


def redis_sse_stream(fetch_data_func, channel, should_refresh=None, keepalive_interval=15):
    """Refresh an SSE snapshot only after a relevant Redis notification."""

    @stream_with_context
    def generator():
        logger.info("Redis SSE connected to %s", channel)
        pubsub = redis_client.pubsub(ignore_subscribe_messages=True)

        try:
            # Subscribe before fetching so a mutation cannot be missed between the
            # initial snapshot and subscription setup.
            pubsub.subscribe(channel)
            yield f"data: {json.dumps(fetch_data_func())}\n\n"
            db.session.remove()

            while True:
                message = pubsub.get_message(timeout=keepalive_interval)
                if message is None:
                    yield ": keep-alive\n\n"
                    continue

                try:
                    payload = json.loads(message['data'])
                except (TypeError, json.JSONDecodeError):
                    logger.warning("Ignoring invalid Redis SSE payload on %s", channel)
                    continue

                if should_refresh is not None and not should_refresh(payload):
                    continue

                try:
                    yield f"data: {json.dumps(fetch_data_func())}\n\n"
                except Exception as e:
                    logger.error("Redis SSE refresh error: %s", e)
                finally:
                    db.session.remove()
        except GeneratorExit:
            logger.info("Redis SSE client disconnected")
        except (ConnectionResetError, BrokenPipeError):
            logger.info("Redis SSE client forcibly disconnected")
        except Exception as e:
            logger.error("Redis SSE error: %s", e)
        finally:
            db.session.remove()
            pubsub.close()
            logger.info("Redis SSE cleaned up")

    return Response(
        generator(),
        content_type='text/event-stream',
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
