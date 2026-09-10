from __future__ import annotations

from cmath import phase
from dataclasses import dataclass
from math import degrees
from typing import Mapping

from .ac import AC, ACConfiguration, solve_ac
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
    """Execution adapter for the Live runtime boundary."""

    manager: LiveSimulationManager

    def start(self, configuration: SimulationConfiguration) -> LiveSimulationSnapshot:
        if configuration.mode is not SimulationMode.LIVE:
            raise LiveSimulationRuntimeError("live runtime requires simulation.mode='live'")
        session = self.manager.create(configuration)
        return self.manager.start(session.session_id)

    def step(self, session_id: str, model: SimulationModel, *, known: Mapping[object, float] | None = None, configuration: SimulationConfiguration | None = None) -> LiveSimulationSnapshot:
        if configuration is None:
            raise LiveSimulationRuntimeError("live runtime step requires a simulation configuration")
        if configuration.mode is not SimulationMode.LIVE:
            raise LiveSimulationRuntimeError("live runtime requires simulation.mode='live'")
        try:
            current = self.manager.get(session_id)
        except LiveSimulationServiceError as exc:
            raise LiveSimulationRuntimeError(str(exc)) from exc
        if current.status != "running":
            return current

        try:
            if configuration.analysis == AC:
                result = solve_ac(model, ACConfiguration.from_dict(configuration.settings))
                signals = {}
                for key, value in result.values.items():
                    signals[f"{key}.magnitude"] = abs(value)
                    signals[f"{key}.phase_deg"] = degrees(phase(value))
            elif configuration.analysis == DC_OPERATING_POINT:
                result = get_simulation_analysis(configuration.analysis).run(model, known=dict(known or {}), configuration=configuration)
                if not isinstance(result, SimulationResult):
                    raise LiveSimulationRuntimeError("live DC runtime expected a single simulation result")
                signals = {str(key): float(value) for key, value in result.values.items()}
            else:
                raise LiveSimulationRuntimeError(f"live runtime currently supports '{DC_OPERATING_POINT}' and '{AC}' only")
        except Exception as exc:
            try:
                self.manager.fail(session_id, str(exc) or "live simulation step failed")
            except LiveSimulationServiceError:
                pass
            raise LiveSimulationRuntimeError(str(exc)) from exc

        try:
            return self.manager.update(session_id, independent_value=None, signals=signals)
        except LiveSimulationServiceError as exc:
            if "must be running to update state" in str(exc):
                return self.manager.get(session_id)
            raise LiveSimulationRuntimeError(str(exc)) from exc

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
