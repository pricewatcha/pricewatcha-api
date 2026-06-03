"""Official Python SDK for the Pricewatcha public preview API."""

from pricewatcha.client import DEFAULT_BASE_URL, Pricewatcha
from pricewatcha.exceptions import (
    PricewatchaAPIError,
    PricewatchaError,
    PricewatchaTimeoutError,
)

__all__ = [
    "DEFAULT_BASE_URL",
    "Pricewatcha",
    "PricewatchaAPIError",
    "PricewatchaError",
    "PricewatchaTimeoutError",
]

__version__ = "0.1.0"
