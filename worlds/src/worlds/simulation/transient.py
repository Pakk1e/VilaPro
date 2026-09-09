from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Mapping

from .dynamic import DynamicComponentError, TransientDynamicStateHandler
from .model import SimulationModel
from .session import SimulationSession
from .solver import SimulationResult, SimulationSolver, SolverError
from .network import build_network_equation_system
from .state import DynamicState, DynamicStateSnapshot, TransientStepContext


class TransientAnalysisError(ValueError):
    """Raised when transient-analysis configuration or execution is invalid."""


class TransientConfigurationError(TransientAnalysisError):
    """Raised when transient-analysis configuration is invalid."""


@dataclass(frozen=True)
class TransientConfiguration:
    """Validated time-domain simulation configuration."""

    start: float = 0.0
    stop: float = 1.0
    step: float = 0.01

    def __post_init__(self) -> None:
        start = float(self.start)
        stop = float(self.stop)
        step = float(self.step)
        if step <= 0:
            raise TransientConfigurationError("transient.settings.step must be greater than zero")
        if stop < start:
            raise TransientConfigurationError("transient.settings.stop must not be below start")
        if len(self.time_points()) > 10_000:
            raise TransientConfigurationError("transient produces more than 10000 points")

    def time_points(self) -> tuple[float, ...]:
        start = float(self.start)
        stop = float(self.stop)
        step = float(self.step)
        points = [round(start, 12)]
        current = start
        epsilon = abs(step) * 1e-12 + 1e-15
        while current + step <= stop + epsilon:
            current += step
            if current > stop and current - stop <= epsilon:
                current = stop
            points.append(round(current, 12))
            if len(points) > 10_000:
                break
        if points[-1] < stop - epsilon:
            points.append(round(stop, 12))
        return tuple(points)

    @classmethod
    def from_dict(cls, settings: Mapping[str, object] | None) -> "TransientConfiguration":
        settings = settings or {}
        return cls(
            start=float(settings.get("start", 0.0)),
            stop=float(settings.get("stop", 1.0)),
            step=float(settings.get("step", 0.01)),
        )


@dataclass(frozen=True)
class TransientResult:
    """Time-domain result containing one operating-point snapshot per time point."""

    points: tuple[Decimal, ...]
    results: tuple[SimulationResult | None, ...]
    errors: tuple[str | None, ...]


def parse_transient_settings(settings: Mapping[str, object]) -> tuple[Decimal, Decimal, Decimal]:
    """Validate and return start, stop, and step times."""
    start = _finite_decimal(settings.get("start", 0), "start")
    stop = _finite_decimal(settings.get("stop"), "stop")
    step = _finite_decimal(settings.get("step"), "step")
    if step <= 0:
        raise TransientAnalysisError("transient.settings.step must be greater than zero")
    if stop < start:
        raise TransientAnalysisError("transient.settings.stop must not be below start")
    if _count_points(start, stop, step) > 10_000:
        raise TransientAnalysisError("transient produces more than 10000 points")
    return start, stop, step


def build_time_points(start: Decimal, stop: Decimal, step: Decimal) -> list[Decimal]:
    points: list[Decimal] = []
    current = start
    while current <= stop:
        points.append(current)
        current += step
    return points


def build_execution_points(start: Decimal, stop: Decimal, step: Decimal) -> tuple[list[Decimal], int]:
    """Build the physical simulation timeline and identify its output start.

    A transient analysis with a positive display start still has its initial
    condition at t=0. The solver therefore warms the dynamic state from t=0
    to the requested start, but only returns points from start onward.
    """
    output_points = build_time_points(start, stop, step)
    if start <= 0:
        return output_points, 0

    warmup_points = build_time_points(Decimal("0"), start, step)
    if warmup_points[-1] != start:
        warmup_points.append(start)

    execution_points = warmup_points + output_points[1:]
    return execution_points, len(warmup_points) - 1


class TransientAnalysis:
    key = "transient"

    def run(
        self,
        model: SimulationModel,
        *,
        known: dict[object, float] | None = None,
        configuration=None,
        session: SimulationSession | None = None,
    ) -> TransientResult:
        if configuration is None:
            raise TransientAnalysisError("transient requires a simulation configuration")

        start, stop, step = parse_transient_settings(configuration.settings)
        points = build_time_points(start, stop, step)
        execution_points, output_start_index = build_execution_points(start, stop, step)
        if len(execution_points) > 20_000:
            raise TransientAnalysisError("transient warm-up produces more than 20000 simulation steps")

        results: list[SimulationResult | None] = []
        errors: list[str | None] = []
        base_known = dict(known or {})
        dynamic_state = DynamicState()
        previous_time: float | None = None
        state_handler = TransientDynamicStateHandler()

        for execution_index, time in enumerate(execution_points):
            current_time = float(time)
            if session is not None and session.cancel_requested:
                session.cancel()
                raise TransientAnalysisError("simulation was cancelled")

            context = TransientStepContext(
                time=current_time,
                previous_time=previous_time,
                dt=None if previous_time is None else current_time - previous_time,
            )
            previous_state: DynamicStateSnapshot = dynamic_state.snapshot()

            try:
                step_model = state_handler.prepare_step(model, previous_state, context)
                system = build_network_equation_system(step_model)
                solved = SimulationSolver().solve(system, known=base_known)
                result = SimulationResult(
                    values=solved.values,
                    instances={component.name: component for component in step_model.components},
                )
            except DynamicComponentError as exc:
                # A malformed dynamic component is a configuration/model error,
                # not a failed numerical point. Do not hide it as a point failure.
                raise TransientAnalysisError(str(exc)) from exc
            except SolverError as exc:
                message = str(exc) or "Transient operating point did not converge"
                if execution_index >= output_start_index:
                    results.append(None)
                    errors.append(message)
                if session is not None:
                    session.record_point({"status": "failed", "error": message}, time=current_time)
                continue

            # Commit dynamic state after every converged physical step, including
            # warm-up steps that are not exposed in the returned result.
            state_handler.accept_step(dynamic_state, result, context)
            if execution_index >= output_start_index:
                results.append(result)
                errors.append(None)
                if session is not None:
                    session.record_point(result, time=current_time)
            previous_time = current_time

        return TransientResult(tuple(points), tuple(results), tuple(errors))


def _finite_decimal(value: object, name: str) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise TransientAnalysisError(f"transient.settings.{name} must be a finite number")
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise TransientAnalysisError(f"transient.settings.{name} must be a finite number") from None
    if not parsed.is_finite():
        raise TransientAnalysisError(f"transient.settings.{name} must be a finite number")
    return parsed


def _count_points(start: Decimal, stop: Decimal, step: Decimal) -> int:
    if start == stop:
        return 1
    distance = stop - start
    return int(distance / step) + 1 + int(distance % step != 0)
