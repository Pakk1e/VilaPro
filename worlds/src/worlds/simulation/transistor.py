from __future__ import annotations

from dataclasses import replace
from enum import Enum

from worlds.math import Binary, Equation, FunctionCall, Number, Variable

from .model import SimulationComponent, SimulationModel
from .network import build_network_equation_system
from .solver import SimulationResult, SimulationSolver, SolverError


class TransistorConvergenceError(SolverError):
    """Raised when the NPN piecewise-linear operating region cannot be resolved."""


class NPNRegion(str, Enum):
    CUTOFF = "cutoff"
    ACTIVE = "active"
    SATURATION = "saturation"


TRANSISTOR_MAX_ITERATIONS = 50
TRANSISTOR_VOLTAGE_TOLERANCE = 1e-9
TRANSISTOR_CURRENT_TOLERANCE = 1e-12


def has_transistors(model: SimulationModel) -> bool:
    return any(component.component_type == "NPNTransistor" for component in model.components)


def solve_transistor_network(model: SimulationModel, *, known: dict[object, float] | None = None) -> SimulationResult:
    """Solve NPN BJTs with a deterministic cutoff/active/saturation PWL model.

    Cutoff:       Ib = 0, Ic = 0
    Forward active: Vbe = Vbe_on, Ic = beta * Ib
    Saturation:   Vbe = Vbe_on, Vce = Vce_sat

    The model intentionally targets educational DC operating-point and sweep
    work. It does not claim a frequency-dependent small-signal transistor model.
    """
    states = {
        component.name: NPNRegion.CUTOFF
        for component in model.components
        if component.component_type == "NPNTransistor"
    }
    base_known = dict(known or {})

    for _ in range(TRANSISTOR_MAX_ITERATIONS):
        result = _solve_state(model, states, base_known)
        next_states = dict(states)

        for component in model.components:
            if component.component_type != "NPNTransistor":
                continue
            ports = component.ports
            base, collector, emitter = ports.get("b"), ports.get("c"), ports.get("e")
            if not base or not collector or not emitter:
                raise SolverError(f"NPN transistor '{component.display_name}' must have b/c/e ports")
            vbe_on = _positive_parameter(component, "Vbe", "Vbe must be greater than zero")
            vce_sat = _positive_parameter(component, "VceSat", "VceSat must be greater than zero")
            beta = _positive_parameter(component, "Beta", "Beta must be greater than zero")
            vbe = result.node_voltage(base) - result.node_voltage(emitter)
            vce = result.node_voltage(collector) - result.node_voltage(emitter)
            ib = result.component_current(component.name, base, emitter)
            ic = result.component_current(component.name, collector, emitter)
            state = states[component.name]

            if state == NPNRegion.CUTOFF:
                if vbe > vbe_on + TRANSISTOR_VOLTAGE_TOLERANCE:
                    next_states[component.name] = NPNRegion.ACTIVE
            elif state == NPNRegion.ACTIVE:
                if vbe < vbe_on - TRANSISTOR_VOLTAGE_TOLERANCE or ib < -TRANSISTOR_CURRENT_TOLERANCE:
                    next_states[component.name] = NPNRegion.CUTOFF
                elif vce < vce_sat - TRANSISTOR_VOLTAGE_TOLERANCE:
                    next_states[component.name] = NPNRegion.SATURATION
            else:
                if vbe < vbe_on - TRANSISTOR_VOLTAGE_TOLERANCE or ib < -TRANSISTOR_CURRENT_TOLERANCE:
                    next_states[component.name] = NPNRegion.CUTOFF
                elif vce > vce_sat + TRANSISTOR_VOLTAGE_TOLERANCE:
                    next_states[component.name] = NPNRegion.ACTIVE

            # Keep beta referenced here so invalid values are rejected even
            # when the current operating region is cutoff.
            _ = beta
            _ = ic

        if next_states == states:
            return result
        states = next_states

    raise TransistorConvergenceError("NPN transistor operating point did not converge")


def _solve_state(model: SimulationModel, states: dict[str, NPNRegion], known):
    linear_model = _apply_transistor_states(model, states)
    equation_system = build_network_equation_system(linear_model)
    solved = SimulationSolver().solve(equation_system, known=known)
    return SimulationResult(values=solved.values, instances={component.name: component for component in model.components})


def _apply_transistor_states(model: SimulationModel, states: dict[str, NPNRegion]) -> SimulationModel:
    components: list[SimulationComponent] = []
    for component in model.components:
        if component.component_type != "NPNTransistor":
            components.append(component)
            continue

        vbe_on = _positive_parameter(component, "Vbe", "Vbe must be greater than zero")
        vce_sat = _positive_parameter(component, "VceSat", "VceSat must be greater than zero")
        beta = _positive_parameter(component, "Beta", "Beta must be greater than zero")
        b, c, e = Variable("b"), Variable("c"), Variable("e")
        ib = FunctionCall("current", (b, e))
        ic = FunctionCall("current", (c, e))
        vbe = FunctionCall("voltage", (b, e))
        vce = FunctionCall("voltage", (c, e))
        state = states.get(component.name, NPNRegion.CUTOFF)

        if state == NPNRegion.ACTIVE:
            equations = [
                Equation(vbe, Number(vbe_on)),
                Equation(ic, Binary(Number(beta), "*", ib)),
            ]
        elif state == NPNRegion.SATURATION:
            equations = [
                Equation(vbe, Number(vbe_on)),
                Equation(vce, Number(vce_sat)),
            ]
        else:
            equations = [
                Equation(ib, Number(0.0)),
                Equation(ic, Number(0.0)),
            ]

        components.append(replace(component, equations=equations))

    return SimulationModel(components=components, nodes=set(model.nodes))


def _positive_parameter(component: SimulationComponent, name: str, message: str) -> float:
    value = float(component.parameters.get(name, 0.0))
    if value <= 0:
        raise SolverError(f"NPN transistor '{component.component_id}': {message}")
    return value
