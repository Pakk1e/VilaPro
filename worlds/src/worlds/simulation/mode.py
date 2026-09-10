from __future__ import annotations

from enum import Enum


class SimulationMode(str, Enum):
    """Execution mode for a simulation analysis."""

    STATIC = "static"
    LIVE = "live"
