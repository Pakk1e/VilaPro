from __future__ import annotations

from dataclasses import dataclass, field
from threading import RLock
from typing import Mapping

from .analysis import SimulationConfiguration, SimulationAnalysisError
from .live import LiveSimulationError, LiveSimulationSnapshot, LiveSimulationState
from .mode import SimulationMode


class LiveSimulationServiceError(RuntimeError):
    """Raised when a live simulation session cannot be managed."""


@dataclass
class LiveSimulationManager:
    """In-memory lifecycle manager for live simulation sessions.

    Execution is intentionally not implemented here yet. This boundary gives the
    API a stable session model before a background runtime and streaming transport
    are introduced.
    """

    _sessions: dict[str, LiveSimulationState] = field(default_factory=dict)
    _lock: RLock = field(default_factory=RLock, repr=False)

    def create(self, configuration: SimulationConfiguration) -> LiveSimulationSnapshot:
        if configuration.mode is not SimulationMode.LIVE:
            raise LiveSimulationServiceError("live session requires simulation.mode='live'")
        state = LiveSimulationState(analysis=configuration.analysis)
        with self._lock:
            self._sessions[state.session_id] = state
        return state.snapshot()

    def get(self, session_id: str) -> LiveSimulationSnapshot:
        with self._lock:
            state = self._sessions.get(session_id)
        if state is None:
            raise LiveSimulationServiceError(f"live simulation session '{session_id}' does not exist")
        return state.snapshot()

    def start(self, session_id: str) -> LiveSimulationSnapshot:
        state = self._get_state(session_id)
        try:
            state.start()
        except LiveSimulationError as exc:
            raise LiveSimulationServiceError(str(exc)) from exc
        return state.snapshot()

    def update(self, session_id: str, *, independent_value: float | None = None, signals: Mapping[str, object] | None = None) -> LiveSimulationSnapshot:
        state = self._get_state(session_id)
        try:
            state.update(independent_value=independent_value, signals=dict(signals) if signals is not None else None)
        except LiveSimulationError as exc:
            raise LiveSimulationServiceError(str(exc)) from exc
        return state.snapshot()

    def complete(self, session_id: str) -> LiveSimulationSnapshot:
        state = self._get_state(session_id)
        try:
            state.complete()
        except LiveSimulationError as exc:
            raise LiveSimulationServiceError(str(exc)) from exc
        return state.snapshot()

    def cancel(self, session_id: str) -> LiveSimulationSnapshot:
        state = self._get_state(session_id)
        state.cancel()
        return state.snapshot()

    def fail(self, session_id: str, error: str) -> LiveSimulationSnapshot:
        state = self._get_state(session_id)
        try:
            state.fail(error)
        except LiveSimulationError as exc:
            raise LiveSimulationServiceError(str(exc)) from exc
        return state.snapshot()

    def _get_state(self, session_id: str) -> LiveSimulationState:
        with self._lock:
            state = self._sessions.get(session_id)
        if state is None:
            raise LiveSimulationServiceError(f"live simulation session '{session_id}' does not exist")
        return state


_DEFAULT_MANAGER = LiveSimulationManager()


def get_live_simulation_manager() -> LiveSimulationManager:
    return _DEFAULT_MANAGER
