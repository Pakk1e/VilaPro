from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class SimulationSessionError(RuntimeError):
    """Raised when a simulation session receives an invalid lifecycle operation."""


class SimulationSessionStatus(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class SimulationSession:
    """Mutable lifecycle state for one simulation execution.

    The session deliberately does not know how a circuit is solved. Analysis
    implementations can use it to track execution state, simulation time,
    accumulated result points, cancellation, and point limits without putting
    execution state into the circuit model or result representation.
    """

    max_points: int = 10_000
    status: SimulationSessionStatus = SimulationSessionStatus.CREATED
    time: float = 0.0
    point_count: int = 0
    results: list[Any] = field(default_factory=list)
    error: str | None = None
    cancel_requested: bool = False

    def __post_init__(self) -> None:
        if isinstance(self.max_points, bool) or not isinstance(self.max_points, int):
            raise SimulationSessionError("max_points must be an integer")
        if self.max_points <= 0:
            raise SimulationSessionError("max_points must be greater than zero")

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            SimulationSessionStatus.COMPLETED,
            SimulationSessionStatus.FAILED,
            SimulationSessionStatus.CANCELLED,
        }

    def start(self) -> None:
        if self.status != SimulationSessionStatus.CREATED:
            raise SimulationSessionError("simulation session can only start from created state")
        self.status = SimulationSessionStatus.RUNNING

    def record_point(self, result: Any, *, time: float | None = None) -> None:
        self._require_running()
        if self.cancel_requested:
            raise SimulationSessionError("simulation session cancellation was requested")
        if self.point_count >= self.max_points:
            raise SimulationSessionError(
                f"simulation exceeds the maximum of {self.max_points} result points"
            )
        if time is not None:
            self.time = float(time)
        self.results.append(result)
        self.point_count += 1

    def complete(self) -> None:
        self._require_running()
        self.status = SimulationSessionStatus.COMPLETED

    def fail(self, error: str) -> None:
        self._require_running()
        if not isinstance(error, str) or not error:
            raise SimulationSessionError("simulation failure must include a non-empty error")
        self.error = error
        self.status = SimulationSessionStatus.FAILED

    def request_cancel(self) -> None:
        if self.is_terminal:
            return
        self.cancel_requested = True

    def cancel(self) -> None:
        self._require_running()
        self.cancel_requested = True
        self.status = SimulationSessionStatus.CANCELLED

    def _require_running(self) -> None:
        if self.status != SimulationSessionStatus.RUNNING:
            raise SimulationSessionError("simulation session must be running for this operation")
