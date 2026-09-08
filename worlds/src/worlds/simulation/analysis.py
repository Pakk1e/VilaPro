from __future__ import annotations

from dataclasses import dataclass, field, replace
from decimal import Decimal, InvalidOperation
from typing import Mapping, Protocol

from worlds.math import Variable

from .model import SimulationModel
from .network import build_network_equation_system
from .session import SimulationSession
from .solver import SimulationResult, SimulationSolver, SolverError
from .state import DynamicState, DynamicStateSnapshot, NoOpTransientStateHandler, TransientStateHandler, TransientStepContext
from .transient import TransientConfiguration, TransientConfigurationError

DC_OPERATING_POINT = "dc_operating_point"
DC_SWEEP = "dc_sweep"
TRANSIENT = "transient"
SUPPORTED_ANALYSES = (DC_OPERATING_POINT, DC_SWEEP, TRANSIENT)
MAX_SWEEP_POINTS = 10_000


class SimulationAnalysisError(ValueError):
    """Raised when a simulation analysis configuration is invalid."""


@dataclass(frozen=True)
class SimulationConfiguration:
    analysis: str = DC_OPERATING_POINT
    settings: Mapping[str, object] = field(default_factory=dict)
    outputs: tuple[str, ...] = ()

    @classmethod
    def from_dict(cls, value: Mapping[str, object] | None) -> "SimulationConfiguration":
        if value is None:
            return cls()
        if not isinstance(value, Mapping):
            raise SimulationAnalysisError("simulation must be an object")
        analysis = value.get("analysis", DC_OPERATING_POINT)
        if not isinstance(analysis, str) or not analysis:
            raise SimulationAnalysisError("simulation.analysis must be a non-empty string")
        if analysis not in SUPPORTED_ANALYSES:
            raise SimulationAnalysisError(f"Unsupported simulation analysis '{analysis}'. Supported analyses: {', '.join(SUPPORTED_ANALYSES)}")
        if "settings" not in value or value.get("settings") is None:
            settings: Mapping[str, object] = {}
        else:
            settings = value.get("settings")
            if not isinstance(settings, Mapping):
                raise SimulationAnalysisError("simulation.settings must be an object")
        if "outputs" not in value or value.get("outputs") is None:
            outputs = []
        else:
            outputs = value.get("outputs")
            if not isinstance(outputs, list) or not all(isinstance(item, str) for item in outputs):
                raise SimulationAnalysisError("simulation.outputs must be a list of strings")
        if analysis == DC_SWEEP:
            cls._validate_dc_sweep_settings(settings)
        elif analysis == TRANSIENT:
            try:
                TransientConfiguration.from_dict(settings)
            except TransientConfigurationError as exc:
                raise SimulationAnalysisError(str(exc)) from exc
        return cls(analysis=analysis, settings=dict(settings), outputs=tuple(outputs))

    @staticmethod
    def _validate_dc_sweep_settings(settings: Mapping[str, object]) -> None:
        source_id = settings.get("source")
        if not isinstance(source_id, str) or not source_id:
            raise SimulationAnalysisError("dc_sweep.settings.source must be a non-empty string")
        parameter = settings.get("parameter")
        if parameter is not None and parameter not in ("V", "I"):
            raise SimulationAnalysisError("dc_sweep.settings.parameter must be 'V' for voltage sources or 'I' for current sources")
        for name in ("start", "stop", "step"):
            _parse_finite_decimal(settings.get(name), name)
        step = _parse_finite_decimal(settings.get("step"), "step")
        if step == 0:
            raise SimulationAnalysisError("dc_sweep.settings.step must not be zero")
        start = _parse_finite_decimal(settings.get("start"), "start")
        stop = _parse_finite_decimal(settings.get("stop"), "stop")
        if start < stop and step < 0:
            raise SimulationAnalysisError("dc_sweep.settings.step must be positive when start is below stop")
        if start > stop and step > 0:
            raise SimulationAnalysisError("dc_sweep.settings.step must be negative when start is above stop")
        if _count_sweep_points(start, stop, step) > MAX_SWEEP_POINTS:
            raise SimulationAnalysisError(f"dc_sweep produces more than {MAX_SWEEP_POINTS} points")

    def to_dict(self) -> dict[str, object]:
        return {"analysis": self.analysis, "settings": dict(self.settings), "outputs": list(self.outputs)}


@dataclass(frozen=True)
class DCSweepResult:
    source_id: str
    parameter: str
    points: tuple[Decimal, ...]
    results: tuple[SimulationResult | None, ...]
    errors: tuple[str | None, ...]


@dataclass(frozen=True)
class TransientResult:
    points: tuple[float, ...]
    results: tuple[SimulationResult | None, ...]
    errors: tuple[str | None, ...]
    state_snapshots: tuple[DynamicStateSnapshot, ...] = ()
    step_contexts: tuple[TransientStepContext, ...] = ()


class SimulationAnalysis(Protocol):
    key: str
    def run(self, model: SimulationModel, *, known: dict[object, float] | None = None, configuration: SimulationConfiguration | None = None, session: SimulationSession | None = None) -> object: ...


class DCOperatingPointAnalysis:
    key = DC_OPERATING_POINT
    def run(self, model: SimulationModel, *, known=None, configuration=None, session=None):
        result = _solve(model, known)
        if session is not None:
            session.record_point(result, time=0.0)
        return result


class DCSweepAnalysis:
    key = DC_SWEEP
    def run(self, model, *, known=None, configuration=None, session=None):
        if configuration is None:
            raise SimulationAnalysisError("dc_sweep requires a simulation configuration")
        source_id, parameter, start, stop, step = self._parse_settings(configuration.settings, model)
        points = _build_sweep_points(start, stop, step)
        base_known = dict(known or {})
        results, errors = [], []
        for point in points:
            _check_cancel(session)
            swept_model = _override_component_parameter(model, source_id=source_id, parameter=parameter, value=float(point))
            try:
                result = _solve(swept_model, base_known)
            except SolverError as exc:
                message = str(exc) or "DC operating point did not converge"
                results.append(None); errors.append(message)
                if session is not None: session.record_point({"status": "failed", "error": message}, time=float(point))
                continue
            results.append(result); errors.append(None)
            if session is not None: session.record_point(result, time=float(point))
        return DCSweepResult(source_id, parameter, tuple(points), tuple(results), tuple(errors))

    @staticmethod
    def _parse_settings(settings, model):
        source_id = settings.get("source")
        matches = [c for c in model.components if c.component_id == source_id]
        if not matches: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' does not exist in the circuit")
        source = matches[0]
        expected = {"VoltageSource": "V", "CurrentSource": "I"}.get(source.component_type)
        if expected is None: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' is not an independent voltage or current source")
        parameter = settings.get("parameter") or expected
        if parameter != expected: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' must be swept using parameter '{expected}'")
        if parameter not in source.parameters: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' does not expose parameter '{parameter}'")
        return source_id, parameter, _parse_finite_decimal(settings.get("start"), "start"), _parse_finite_decimal(settings.get("stop"), "stop"), _parse_finite_decimal(settings.get("step"), "step")


class TransientAnalysis:
    key = TRANSIENT

    def __init__(self, state_handler: TransientStateHandler | None = None):
        self.state_handler = state_handler or NoOpTransientStateHandler()

    def run(self, model, *, known=None, configuration=None, session=None):
        if configuration is None:
            raise SimulationAnalysisError("transient requires a simulation configuration")
        transient = TransientConfiguration.from_dict(configuration.settings)
        points = transient.time_points()
        results, errors = [], []
        states: list[DynamicStateSnapshot] = []
        contexts: list[TransientStepContext] = []
        base_known = dict(known or {})
        state = DynamicState()
        previous_time = None

        for time in points:
            _check_cancel(session)
            dt = None if previous_time is None else time - previous_time
            context = TransientStepContext(time=time, previous_time=previous_time, dt=dt)
            previous_state = state.snapshot()
            step_model = self.state_handler.prepare_step(model, previous_state, context)
            if step_model is None:
                raise SimulationAnalysisError("transient state handler returned no model")
            try:
                result = _solve(step_model, base_known)
            except SolverError as exc:
                message = str(exc) or "Transient operating point did not converge"
                results.append(None); errors.append(message)
                states.append(previous_state)
                contexts.append(context)
                if session is not None: session.record_point({"status": "failed", "error": message}, time=time)
                previous_time = time
                continue

            self.state_handler.accept_step(state, result, context)
            results.append(result); errors.append(None)
            states.append(state.snapshot())
            contexts.append(context)
            if session is not None: session.record_point(result, time=time)
            previous_time = time

        return TransientResult(points, tuple(results), tuple(errors), tuple(states), tuple(contexts))


def _solve(model, known):
    equation_system = build_network_equation_system(model)
    solved = SimulationSolver().solve(equation_system, known=known)
    return SimulationResult(values=solved.values, instances={component.name: component for component in model.components})


def _check_cancel(session):
    if session is not None and session.cancel_requested:
        session.cancel()
        raise SimulationAnalysisError("simulation was cancelled")


def _parse_finite_decimal(value, name):
    if isinstance(value, bool) or value is None: raise SimulationAnalysisError(f"dc_sweep.settings.{name} must be a finite number")
    try: parsed = Decimal(str(value))
    except (InvalidOperation, ValueError): raise SimulationAnalysisError(f"dc_sweep.settings.{name} must be a finite number") from None
    if not parsed.is_finite(): raise SimulationAnalysisError(f"dc_sweep.settings.{name} must be a finite number")
    return parsed


def _count_sweep_points(start, stop, step):
    if start == stop: return 1
    distance, increment = abs(stop-start), abs(step)
    return int(distance/increment) + 1 + int(distance % increment != 0)


def _build_sweep_points(start, stop, step):
    points=[]; current=start
    if start == stop: return [start]
    while (step > 0 and current <= stop) or (step < 0 and current >= stop):
        points.append(current); current += step
    return points


def _override_component_parameter(model, *, source_id, parameter, value):
    components=[]; found=False
    for component in model.components:
        if component.component_id != source_id: components.append(component); continue
        components.append(replace(component, parameters={**component.parameters, parameter:value})); found=True
    if not found: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' does not exist in the circuit")
    return SimulationModel(components=components, nodes=set(model.nodes))

_ANALYSES = {DC_OPERATING_POINT: DCOperatingPointAnalysis(), DC_SWEEP: DCSweepAnalysis(), TRANSIENT: TransientAnalysis()}

def get_simulation_analysis(key):
    try: return _ANALYSES[key]
    except KeyError: raise SimulationAnalysisError(f"Unsupported simulation analysis '{key}'. Supported analyses: {', '.join(SUPPORTED_ANALYSES)}") from None
