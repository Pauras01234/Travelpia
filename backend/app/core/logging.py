"""Logging configuration.

Emits single-line records that always carry the current request id, so logs
from concurrent requests can be correlated. Kept dependency-free (stdlib
logging) to stay lightweight; a structured JSON formatter can be swapped in
for production log aggregation without touching call sites.
"""

from __future__ import annotations

import logging
import sys

from app.core.context import get_request_id


class RequestIdFilter(logging.Filter):
    """Inject the active request id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True


def configure_logging(level: str = "INFO") -> None:
    """Configure root logging once at application startup."""
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)-7s [%(request_id)s] "
            "%(name)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())

    # Quieten noisy third-party access logs; our middleware logs requests.
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
