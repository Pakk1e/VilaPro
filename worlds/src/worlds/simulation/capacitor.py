from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Any

from worlds.math import Binary, Equation, FunctionCall, Number, Variable

from .model import SimulationComponent, SimulationModel
from .representation import ElectricalComponentRepresentation
from .state import DynamicState, DynamicStateSnapshot, TransientStepContext


class CapacitorError(ValueError):
    """Raised when a capacitor transient model is invalid."""


@dataclass(frozen=True)
class CapacitorTransientModel(ElectricalComponentRepresentation):
    """Electrical transient representation of an ideal capacitor.

    The physical relationship is i = C * dv/dt. Backward Euler converts it
    to the linear companion relation i[n] = (C/dt) * (v[n] - v[n-1]).
    The numerical method is metadata, not component identity.
    """

    component_type: str = "capacitor"
    analysis: str = "transient"
    method: str = "backward_euler"
    capacitance: float = 0.0

    def __post_init__(self) -> None:
        super().__post_init__()
        if self.capacitance <= 0:
            raise CapacitorError("capacitance must be greater than zero")
        if self.method != "backward_euler":
            raise CapacitorError(f"unsupported capacitor transient method: {self.method}")


def is_capacitor(component: SimulationComponent) -> bool:
    return component.component_type.lower() == "capacitor"


def capacitor_value(component: SimulationComponent) -> float:
    for key in ("capacitance", "C", "c"):
        if key in component.parameters:
            value = float(component.parameters[key])
            if value <= 0:
                raise CapacitorError(f"{key} must be greater than zero")
            return value
    raise CapacitorError(f"Capacitor '{component.name}' requires a capacitance parameter")


def initial_capacitor_voltage(component: SimulationComponent) -> float:
    for key in ("initial_voltage", "initialVoltage", "ic", "IC"):
        if key in component.parameters:
            return float(component.parameters[key])
    return 0.0


def build_capacitor_step_model(
    model: SimulationModel,
    previous_state: DynamicStateSnapshot,
    context: TransientStepContext,
) -> SimulationModel:
    """Return a transient-ready model with capacitor companion equations."""
    components: list[SimulationComponent] = []
    for component in model.components:
        if not is_capacitor(component):
            components.append(component)
            continue
        if context.previous_time is None:
            equations = _initial_equations(component, initial_capacitor_voltage(component))
        else:
            capacitance = capacitor_value(component)
            previous_voltage = previous_state.get(
                component.component_id,
                initial_capacitor_voltage(component),
            )
            conductance = capacitance / context.dt
            equations = _backward_euler_equations(conductance, float(previous_voltage))
        components.append(replace(component, equations=equations))
    return SimulationModel(components=components, nodes=set(model.nodes))


def _backward_euler_equations(conductance: float, previous_voltage: float) -> list[Equation]:
    p = Variable("p")
    n = Variable("n")
    current = FunctionCall("current", (p, n))
    voltage = FunctionCall("voltage", (p, n))
    rhs = Binary(
        left=Binary(left=Number(conductance), operator="*", right=voltage),
        operator="-",
        right=Number(conductance * previous_voltage),
    )
    return [Equation(left=current, right=rhs)]


def _initial_equations(component: SimulationComponent, initial_voltage: float) -> list[Equation]:
    p = Variable("p")
    n = Variable("n")
    voltage = FunctionCall("voltage", (p, n))
    current = FunctionCall("current", (p, n))
    return [
        Equation(left=voltage, right=Number(initial_voltage)),
        Equation(left=current, right=Number(0.0)),
    ]


class CapacitorTransientStateHandler:
    """State handler for ideal capacitors using backward Euler."""

    def prepare_step(
        self,
        model: SimulationModel,
        previous_state: DynamicStateSnapshot,
        context: TransientStepContext,
    ) -> SimulationModel:
        return build_capacitor_step_model(model, previous_state, context)

    def accept_step(self, state: DynamicState, result: Any, context: TransientStepContext) -> None:
        for component in result.instances.values():
            if not is_capacitor(component):
                continue
            ports = component.ports
            if "p" not in ports or "n" not in ports:
                raise CapacitorError(f"Capacitor '{component.name}' must define p/n ports")
            voltage = result.node_voltage(ports["p"]) - result.node_voltage(ports["n"])
            state.set(component.component_id, float(voltage))


__all__ = [
    "CapacitorError",
    "CapacitorTransientModel",
    "CapacitorTransientStateHandler",
    "build_capacitor_step_model",
    "capacitor_value",
    "initial_capacitor_voltage",
    "is_capacitor",
]
