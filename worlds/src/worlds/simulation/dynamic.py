from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Any

from worlds.math import Binary, Equation, FunctionCall, Number, Variable

from .model import SimulationComponent, SimulationModel
from .representation import ElectricalComponentRepresentation
from .state import DynamicState, DynamicStateSnapshot, TransientStepContext, TransientStateHandler
from .time_varying import TimeVaryingSourceError, evaluate_time_varying_source


class DynamicComponentError(ValueError):
    """Raised when a dynamic component definition is invalid."""


@dataclass(frozen=True, init=False)
class CapacitorTransientModel(ElectricalComponentRepresentation):
    """Backward-Euler transient representation of an electrical capacitor."""

    component_type: str = "Capacitor"
    layer: str = "electrical"
    analysis: str = "transient"
    method: str = "backward_euler"
    _configured_capacitance: float | None = None

    def __init__(self, capacitance: float | None = None) -> None:
        object.__setattr__(self, "component_type", "Capacitor")
        object.__setattr__(self, "layer", "electrical")
        object.__setattr__(self, "analysis", "transient")
        object.__setattr__(self, "method", "backward_euler")
        object.__setattr__(self, "_configured_capacitance", capacitance)

    def _validate_capacitance_value(self, value: object, name: str = "Capacitor") -> float:
        if value is None:
            raise DynamicComponentError(f"{name} must define capacitance")
        try:
            capacitance = float(value)
        except (TypeError, ValueError):
            raise DynamicComponentError(f"{name} capacitance must be a finite number") from None
        if not capacitance == capacitance or capacitance in (float("inf"), float("-inf")):
            raise DynamicComponentError(f"{name} capacitance must be a finite number")
        if capacitance <= 0:
            raise DynamicComponentError(f"{name} capacitance must be greater than zero")
        return capacitance

    def capacitance(self, component: SimulationComponent) -> float:
        value = component.parameters.get("C", component.parameters.get("capacitance", self._configured_capacitance))
        return self._validate_capacitance_value(value, f"Capacitor '{component.name}'")

    def capacitance_for(self, component: SimulationComponent) -> float:
        return self.capacitance(component)

    def capacitance_value(self) -> float:
        return self._validate_capacitance_value(self._configured_capacitance)

    def initial_voltage(self, component: SimulationComponent) -> float:
        value = component.parameters.get("initial_voltage", component.parameters.get("initialVoltage", 0.0))
        try:
            voltage = float(value)
        except (TypeError, ValueError):
            raise DynamicComponentError(f"Capacitor '{component.name}' initial voltage must be a finite number") from None
        if voltage != voltage or voltage in (float("inf"), float("-inf")):
            raise DynamicComponentError(f"Capacitor '{component.name}' initial voltage must be a finite number")
        return voltage

    def companion_terms(self, component: SimulationComponent, previous_voltage: float, dt: float) -> tuple[float, float]:
        if dt <= 0:
            raise DynamicComponentError("Capacitor transient dt must be greater than zero")
        conductance = self.capacitance(component) / dt
        history_current = -conductance * float(previous_voltage)
        return conductance, history_current

    def prepare_equation(self, component: SimulationComponent, previous_voltage: float, dt: float | None) -> Equation:
        if "p" not in component.ports or "n" not in component.ports:
            raise DynamicComponentError(f"Capacitor '{component.name}' must define p/n ports")
        if dt is None:
            return Equation(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), right=Number(previous_voltage))
        conductance, _history_current = self.companion_terms(component, previous_voltage, dt)
        return Equation(
            left=FunctionCall("current", (Variable("p"), Variable("n"))),
            right=Binary(
                left=Number(conductance), operator="*",
                right=Binary(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), operator="-", right=Number(previous_voltage)),
            ),
        )


@dataclass(frozen=True, init=False)
class InductorTransientModel(ElectricalComponentRepresentation):
    """Backward-Euler transient representation of an electrical inductor."""

    component_type: str = "Inductor"
    layer: str = "electrical"
    analysis: str = "transient"
    method: str = "backward_euler"
    _configured_inductance: float | None = None

    def __init__(self, inductance: float | None = None) -> None:
        object.__setattr__(self, "component_type", "Inductor")
        object.__setattr__(self, "layer", "electrical")
        object.__setattr__(self, "analysis", "transient")
        object.__setattr__(self, "method", "backward_euler")
        object.__setattr__(self, "_configured_inductance", inductance)

    def _validate_inductance_value(self, value: object, name: str = "Inductor") -> float:
        if value is None:
            raise DynamicComponentError(f"{name} must define inductance")
        try:
            inductance = float(value)
        except (TypeError, ValueError):
            raise DynamicComponentError(f"{name} inductance must be a finite number") from None
        if not inductance == inductance or inductance in (float("inf"), float("-inf")):
            raise DynamicComponentError(f"{name} inductance must be a finite number")
        if inductance <= 0:
            raise DynamicComponentError(f"{name} inductance must be greater than zero")
        return inductance

    def inductance(self, component: SimulationComponent) -> float:
        value = component.parameters.get("L", component.parameters.get("inductance", self._configured_inductance))
        return self._validate_inductance_value(value, f"Inductor '{component.name}'")

    def inductance_for(self, component: SimulationComponent) -> float:
        return self.inductance(component)

    def inductance_value(self) -> float:
        return self._validate_inductance_value(self._configured_inductance)

    def initial_current(self, component: SimulationComponent) -> float:
        value = component.parameters.get("initial_current", component.parameters.get("initialCurrent", 0.0))
        try:
            current = float(value)
        except (TypeError, ValueError):
            raise DynamicComponentError(f"Inductor '{component.name}' initial current must be a finite number") from None
        if current != current or current in (float("inf"), float("-inf")):
            raise DynamicComponentError(f"Inductor '{component.name}' initial current must be a finite number")
        return current

    def companion_terms(self, component: SimulationComponent, previous_current: float, dt: float) -> tuple[float, float]:
        if dt <= 0:
            raise DynamicComponentError("Inductor transient dt must be greater than zero")
        conductance = dt / self.inductance(component)
        return conductance, float(previous_current)

    def prepare_equation(self, component: SimulationComponent, previous_current: float, dt: float | None) -> Equation:
        if "p" not in component.ports or "n" not in component.ports:
            raise DynamicComponentError(f"Inductor '{component.name}' must define p/n ports")
        if dt is None:
            return Equation(left=FunctionCall("current", (Variable("p"), Variable("n"))), right=Number(previous_current))
        conductance, history_current = self.companion_terms(component, previous_current, dt)
        return Equation(
            left=FunctionCall("current", (Variable("p"), Variable("n"))),
            right=Binary(
                left=Binary(left=Number(conductance), operator="*", right=FunctionCall("voltage", (Variable("p"), Variable("n")))),
                operator="+", right=Number(history_current),
            ),
        ) if history_current != 0 else Equation(
            left=FunctionCall("current", (Variable("p"), Variable("n"))),
            right=Binary(
                left=Number(conductance), operator="*",
                right=FunctionCall("voltage", (Variable("p"), Variable("n"))),
            ),
        )


class CapacitorStateHandler(TransientStateHandler):
    """Transient state handler for all Capacitor instances in a model."""

    def __init__(self, model: CapacitorTransientModel | None = None) -> None:
        self.model = model or CapacitorTransientModel()

    def prepare_step(self, model: SimulationModel, previous_state: DynamicStateSnapshot, context: TransientStepContext) -> SimulationModel:
        components: list[SimulationComponent] = []
        for component in model.components:
            if component.component_type != self.model.component_type:
                components.append(component)
                continue
            self.model.capacitance_for(component)
            previous_voltage = previous_state.get(component.component_id, self.model.initial_voltage(component))
            if not isinstance(previous_voltage, (int, float)) or isinstance(previous_voltage, bool):
                raise DynamicComponentError(f"Capacitor '{component.name}' state voltage must be numeric")
            equation = self.model.prepare_equation(component, float(previous_voltage), context.dt)
            components.append(replace(component, equations=[equation]))
        return SimulationModel(components=components, nodes=set(model.nodes))

    def accept_step(self, state: DynamicState, result: Any, context: TransientStepContext) -> None:
        for component in getattr(result, "instances", {}).values():
            if getattr(component, "component_type", None) != self.model.component_type:
                continue
            try:
                voltage = result.instance(component.name).voltage()
            except Exception as exc:
                raise DynamicComponentError(f"Unable to read transient voltage for capacitor '{component.name}'") from exc
            state.set(component.component_id, float(voltage))


class InductorStateHandler(TransientStateHandler):
    """Transient state handler for all Inductor instances in a model."""

    def __init__(self, model: InductorTransientModel | None = None) -> None:
        self.model = model or InductorTransientModel()

    def prepare_step(self, model: SimulationModel, previous_state: DynamicStateSnapshot, context: TransientStepContext) -> SimulationModel:
        components: list[SimulationComponent] = []
        for component in model.components:
            if component.component_type != self.model.component_type:
                components.append(component)
                continue
            self.model.inductance_for(component)
            previous_current = previous_state.get(component.component_id, self.model.initial_current(component))
            if not isinstance(previous_current, (int, float)) or isinstance(previous_current, bool):
                raise DynamicComponentError(f"Inductor '{component.name}' state current must be numeric")
            equation = self.model.prepare_equation(component, float(previous_current), context.dt)
            components.append(replace(component, equations=[equation]))
        return SimulationModel(components=components, nodes=set(model.nodes))

    def accept_step(self, state: DynamicState, result: Any, context: TransientStepContext) -> None:
        for component in getattr(result, "instances", {}).values():
            if getattr(component, "component_type", None) != self.model.component_type:
                continue
            try:
                current = result.instance(component.name).current()
            except Exception as exc:
                raise DynamicComponentError(f"Unable to read transient current for inductor '{component.name}'") from exc
            state.set(component.component_id, float(current))


def _apply_time_varying_sources(model: SimulationModel, time: float) -> SimulationModel:
    """Evaluate waveform mappings on independent source parameters for one step."""
    components: list[SimulationComponent] = []
    for component in model.components:
        if component.component_type not in {"VoltageSource", "CurrentSource"}:
            components.append(component)
            continue
        parameters = dict(component.parameters)
        for parameter in ("V", "I"):
            if parameter not in parameters:
                continue
            try:
                value = evaluate_time_varying_source(parameters[parameter], time)
            except TimeVaryingSourceError as exc:
                raise DynamicComponentError(
                    f"{component.component_type} '{component.name}' {parameter} waveform is invalid: {exc}"
                ) from exc
            if value is not None:
                parameters[parameter] = value
        components.append(replace(component, parameters=parameters))
    return SimulationModel(components=components, nodes=set(model.nodes))


class TransientDynamicStateHandler(TransientStateHandler):
    """Default transient handler combining dynamic devices and time-varying sources."""

    def __init__(self) -> None:
        self.capacitor_handler = CapacitorStateHandler()
        self.inductor_handler = InductorStateHandler()

    def prepare_step(self, model: SimulationModel, previous_state: DynamicStateSnapshot, context: TransientStepContext) -> SimulationModel:
        model = _apply_time_varying_sources(model, context.time)
        model = self.capacitor_handler.prepare_step(model, previous_state, context)
        return self.inductor_handler.prepare_step(model, previous_state, context)

    def accept_step(self, state: DynamicState, result: Any, context: TransientStepContext) -> None:
        self.capacitor_handler.accept_step(state, result, context)
        self.inductor_handler.accept_step(state, result, context)
