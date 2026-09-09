from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Any

from worlds.math import Binary, Equation, FunctionCall, Number, Variable

from .model import SimulationComponent, SimulationModel
from .representation import ElectricalComponentRepresentation
from .state import DynamicState, DynamicStateSnapshot, TransientStepContext, TransientStateHandler


class DynamicComponentError(ValueError):
    """Raised when a dynamic component definition is invalid."""


@dataclass(frozen=True)
class CapacitorTransientModel(ElectricalComponentRepresentation):
    """Backward-Euler transient representation of an electrical capacitor."""

    capacitance: float | None = None
    component_type: str = "Capacitor"
    layer: str = "electrical"
    method: str = "backward_euler"

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

    def capacitance_for(self, component: SimulationComponent) -> float:
        value = component.parameters.get("C", component.parameters.get("capacitance", self.capacitance))
        return self._validate_capacitance_value(value, f"Capacitor '{component.name}'")

    def capacitance_value(self) -> float:
        return self._validate_capacitance_value(self.capacitance)

    def initial_voltage(self, component: SimulationComponent) -> float:
        value = component.parameters.get("initial_voltage", component.parameters.get("initialVoltage", 0.0))
        try:
            voltage = float(value)
        except (TypeError, ValueError):
            raise DynamicComponentError(f"Capacitor '{component.name}' initial voltage must be a finite number") from None
        if voltage != voltage or voltage in (float("inf"), float("-inf")):
            raise DynamicComponentError(f"Capacitor '{component.name}' initial voltage must be a finite number")
        return voltage

    def prepare_equation(self, component: SimulationComponent, previous_voltage: float, dt: float | None) -> Equation:
        if "p" not in component.ports or "n" not in component.ports:
            raise DynamicComponentError(f"Capacitor '{component.name}' must define p/n ports")
        if dt is None:
            return Equation(
                left=FunctionCall("voltage", (Variable("p"), Variable("n"))),
                right=Number(previous_voltage),
            )

        conductance = self.capacitance_for(component) / dt
        return Equation(
            left=FunctionCall("current", (Variable("p"), Variable("n"))),
            right=Binary(
                left=Number(conductance),
                operator="*",
                right=Binary(
                    left=FunctionCall("voltage", (Variable("p"), Variable("n"))),
                    operator="-",
                    right=Number(previous_voltage),
                ),
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


class TransientDynamicStateHandler(CapacitorStateHandler):
    """Default transient handler, currently covering capacitor state."""

    pass
