from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .analysis import DC_OPERATING_POINT, SimulationConfiguration, get_simulation_analysis
from .live import LiveSimulationSnapshot
from .live_service import LiveSimulationManager, LiveSimulationServiceError
from .mode import SimulationMode
from .model import SimulationModel
from .solver import SimulationResult


class LiveSimulationRuntimeError(RuntimeError):
    """Raised when live solver execution cannot proceed."""


@dataclass
class LiveSimulationRuntime:
    """Synchronous first execution adapter for the Live runtime boundary.

    This intentionally executes one solver update at a time. A later background
    worker can call the same step method repeatedly without changing the session
    contract or frontend payload.
    """

    manager: LiveSimulationManager

    def start(self, configuration: SimulationConfiguration) -> LiveSimulationSnapshot:
        if configuration.mode is not SimulationMode.LIVE:
            raise LiveSimulationRuntimeError("live runtime requires simulation.mode='live'")
        session = self.manager.create(configuration)
        return self.manager.start(session.session_id)

    def step(
        self,
        session_id: str,
        model: SimulationModel,
        *,
        known: Mapping[object, float] | None = None,
        configuration: SimulationConfiguration | None = None,
    ) -> LiveSimulationSnapshot:
        if configuration is None:
            raise LiveSimulationRuntimeError("live runtime step requires a simulation configuration")
        if configuration.mode is not SimulationMode.LIVE:
            raise LiveSimulationRuntimeError("live runtime requires simulation.mode='live'")
        if configuration.analysis != DC_OPERATING_POINT:
            raise LiveSimulationRuntimeError(
                f"live runtime currently supports '{DC_OPERATING_POINT}' only"
            )

        analysis = get_simulation_analysis(configuration.analysis)
        try:
            result = analysis.run(model, known=dict(known or {}), configuration=configuration)
        except Exception as exc:
            self.manager.fail(session_id, str(exc) or "live simulation step failed")
            raise LiveSimulationRuntimeError(str(exc)) from exc

        if not isinstance(result, SimulationResult):
            raise LiveSimulationRuntimeError("live DC runtime expected a single simulation result")

        signals = {str(key): float(value) for key, value in result.values.items()}
        return self.manager.update(
            session_id,
            independent_value=None,
            signals=signals,
        )

    def complete(self, session_id: str) -> LiveSimulationSnapshot:
        try:
            return self.manager.complete(session_id)
        except LiveSimulationServiceError as exc:
            raise LiveSimulationRuntimeError(str(exc)) from exc

    def cancel(self, session_id: str) -> LiveSimulationSnapshot:
        try:
            return self.manager.cancel(session_id)
        except LiveSimulationServiceError as exc:
            raise LiveSimulationRuntimeError(str(exc)) from exc
