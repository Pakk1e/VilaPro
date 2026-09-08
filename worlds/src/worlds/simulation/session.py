from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from uuid import uuid4


class SimulationSessionError(RuntimeError):
    """Raised when a simulation session receives an invalid lifecycle operation."""


class SimulationSessionStatus(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class SimulationSessionSnapshot:
    """Immutable execution snapshot safe to expose to callers."""

    session_id: str
    status: SimulationSessionStatus
    time: float
    point_count: int
    total_points: int | None
    error: str | None
    cancel_requested: bool

    @property
    def progress(self) -> float | None:
        if self.total_points is None:
            return None
        if self.total_points <= 0:
            return 0.0
        return min(1.0, self.point_count / self.total_points)


@dataclass
class SimulationSession:
    """Mutable lifecycle state for one simulation execution.

    The session deliberately does not know how a circuit is solved. Analysis
    implementations can use it to track execution state, simulation time,
    accumulated result points, cancellation, and point limits without putting
    execution state into the circuit model or result representation.
    """

    # Keep session_id first so SimulationSession("op", ...) remains a valid
    # and intuitive construction. Resource limits remain keyword-friendly.
    session_id: str = field(default_factory=lambda: uuid4().hex)
    max_points: int = 10_000
    total_points: int | None = None
    status: SimulationSessionStatus = SimulationSessionStatus.CREATED
    time: float = 0.0
    point_count: int = 0
    results: list[Any] = field(default_factory=list)
    error: str | None = None
    cancel_requested: bool = False

    def __post_init__(self) -> None:
        if not isinstance(self.session_id, str) or not self.session_id:
            raise SimulationSessionError("session_id must be a non-empty string")
        if isinstance(self.max_points, bool) or not isinstance(self.max_points, int):
            raise SimulationSessionError("max_points must be an integer")
        if self.max_points <= 0:
            raise SimulationSessionError("max_points must be greater than zero")
        if self.total_points is not None:
            if isinstance(self.total_points, bool) or not isinstance(self.total_points, int):
                raise SimulationSessionError("total_points must be an integer or None")
            if self.total_points <= 0:
                raise SimulationSessionError("total_points must be greater than zero")
            if self.total_points > self.max_points:
                raise SimulationSessionError("total_points cannot exceed max_points")

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            SimulationSessionStatus.COMPLETED,
            SimulationSessionStatus.FAILED,
            SimulationSessionStatus.CANCELLED,
        }

    @property
    def progress(self) -> float | None:
        return self.snapshot().progress

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
        if self.total_points is not None and self.point_count >= self.total_points:
            raise SimulationSessionError(
                f"simulation already reached the expected {self.total_points} result points"
            )
        if time is not None:
            self.time = float(time)
        self.results.append(result)
        self.point_count += 1

    def complete(self) -> None:
        self._require_running()
        if self.total_points is not None and self.point_count != self.total_points:
            raise SimulationSessionError(
                f"simulation cannot complete with {self.point_count} of {self.total_points} result points"
            )
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

    def snapshot(self) -> SimulationSessionSnapshot:
        """Return an immutable view of execution state without exposing results."""
        return SimulationSessionSnapshot(
            session_id=self.session_id,
            status=self.status,
            time=self.time,
            point_count=self.point_count,
            total_points=self.total_points,
            error=self.error,
            cancel_requested=self.cancel_requested,
        )

    def result_points(self) -> tuple[Any, ...]:
        """Return a frozen copy of accumulated points for finalization."""
        return tuple(self.results)

    def _require_running(self) -> None:
        if self.status != SimulationSessionStatus.RUNNING:
            raise SimulationSessionError("simulation session must be running for this operation")
