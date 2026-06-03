"""Job status helpers shared by SDK polling logic."""

from __future__ import annotations

from typing import Any

TERMINAL_STATUSES = frozenset({"completed", "failed"})
ACTIVE_STATUSES = frozenset({"queued", "running", "processing"})


def is_terminal_job_status(status: Any) -> bool:
    return isinstance(status, str) and status in TERMINAL_STATUSES


def is_active_job_status(status: Any) -> bool:
    return isinstance(status, str) and status in ACTIVE_STATUSES
