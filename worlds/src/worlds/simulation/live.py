from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from .mode import SimulationMode


class LiveSimulationError(RuntimeError):
    """Raised when live simulation state receives an invalid operation."""


@dataclass(frozen=True)
class LiveSimulationSnapshot:
    """Immutable state snapshot suitable for a frontend update."""

    session_id: str
    analysis: str
    mode: SimulationMode
    status: str
    independent_value: float | None
    signals: dict[str, Any]
    error: str | None


@dataclass
class LiveSimulationState:
    """Analysis-independent state held while a live simulation is running.

    This is deliberately separate from static result datasets. A future transport
    can publish snapshots of this object without changing the static result API.
    """

    analysis: str
    session_id: str = field(default_factory=lambda: uuid4().hex)
    status: str = "created"
    independent_value: float | None = None
    signals: dict[str, Any] = field(default_factory=dict)
    error: str | None = None

    def start(self) -> None:
        if self.status != "created":
            raise LiveSimulationError("live simulation can only start from created state")
        self.status = "running"

    def pause(self) -> None:
        if self.status != "running":
            raise LiveSimulationError("live simulation can only pause from running state")
        self.status = "paused"

    def resume(self) -> None:
        if self.status != "paused":
            raise LiveSimulationError("live simulation can only resume from paused state")
        self.status = "running"

    def update(self, *, independent_value: float | None = None, signals: dict[str, Any] | None = None) -> None:
        if self.status != "running":
            raise LiveSimulationError("live simulation must be running to update state")
        if independent_value is not None:
            self.independent_value = float(independent_value)
        if signals is not None:
            self.signals = dict(signals)

    def complete(self) -> None:
        if self.status != "running":
            raise LiveSimulationError("live simulation must be running to complete")
        self.status = "completed"

    def fail(self, error: str) -> None:
        if self.status != "running":
            raise LiveSimulationError("live simulation must be running to fail")
        if not error:
            raise LiveSimulationError("live simulation failure must include an error")
        self.error = str(error)
        self.status = "failed"

    def cancel(self) -> None:
        if self.status not in {"created", "running", "paused"}:
            return
        self.status = "cancelled"

    def snapshot(self) -> LiveSimulationSnapshot:
        return LiveSimulationSnapshot(
            session_id=self.session_id,
            analysis=self.analysis,
            mode=SimulationMode.LIVE,
            status=self.status,
            independent_value=self.independent_value,
            signals=dict(self.signals),
            error=self.error,
        )
