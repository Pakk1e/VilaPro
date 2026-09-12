from __future__ import annotations

from dataclasses import replace
from enum import Enum

from worlds.math import Binary, Equation, FunctionCall, Number, Variable

from .model import SimulationComponent, SimulationModel
from .mosfet import has_mosfets, solve_mosfet_network
from .network import build_network_equation_system
from .solver import SimulationResult, SimulationSolver, SolverError


class TransistorConvergenceError(SolverError):
    """Raised when a BJT piecewise-linear operating region cannot be resolved."""


class NPNRegion(str, Enum):
    CUTOFF = "cutoff"
    ACTIVE = "active"
    SATURATION = "saturation"


class PNPRegion(str, Enum):
    CUTOFF = "cutoff"
    ACTIVE = "active"
    SATURATION = "saturation"


TRANSISTOR_MAX_ITERATIONS = 50
TRANSISTOR_VOLTAGE_TOLERANCE = 1e-9
TRANSISTOR_CURRENT_TOLERANCE = 1e-12


def has_transistors(model: SimulationModel) -> bool:
    return any(component.component_type in {"NPNTransistor", "PNPTransistor"} for component in model.components) or has_mosfets(model)


def solve_transistor_network(model: SimulationModel, *, known: dict[object, float] | None = None) -> SimulationResult:
    """Dispatch nonlinear semiconductor networks to the appropriate solver."""
    if has_mosfets(model):
        if any(component.component_type in {"NPNTransistor", "PNPTransistor"} for component in model.components):
            raise SolverError("Circuits containing both BJTs and MOSFETs are not yet supported by the combined nonlinear solver")
        return solve_mosfet_network(model, known=known)

    states = {}
    for component in model.components:
        if component.component_type == "NPNTransistor":
            states[component.name] = NPNRegion.CUTOFF
        elif component.component_type == "PNPTransistor":
            states[component.name] = PNPRegion.CUTOFF
    base_known = dict(known or {})

    for _ in range(TRANSISTOR_MAX_ITERATIONS):
        result = _solve_state(model, states, base_known)
        next_states = dict(states)
        for component in model.components:
            if component.component_type == "NPNTransistor":
                next_states[component.name] = _next_npn_state(component, states[component.name], result)
            elif component.component_type == "PNPTransistor":
                next_states[component.name] = _next_pnp_state(component, states[component.name], result)
        if next_states == states:
            return result
        states = next_states
    raise TransistorConvergenceError("BJT operating point did not converge")


def _solve_state(model, states, known):
    linear_model = _apply_transistor_states(model, states)
    equation_system = build_network_equation_system(linear_model)
    solved = SimulationSolver().solve(equation_system, known=known)
    return SimulationResult(values=solved.values, instances={component.name: component for component in model.components})


def _apply_transistor_states(model: SimulationModel, states) -> SimulationModel:
    components: list[SimulationComponent] = []
    for component in model.components:
        if component.component_type not in {"NPNTransistor", "PNPTransistor"}:
            components.append(component)
            continue
        vbe_on = _positive_parameter(component, "Vbe", "Vbe must be greater than zero")
        vce_sat = _positive_parameter(component, "VceSat", "VceSat must be greater than zero")
        beta = _positive_parameter(component, "Beta", "Beta must be greater than zero")
        b, c, e = Variable("b"), Variable("c"), Variable("e")
        state = states.get(component.name)
        if component.component_type == "NPNTransistor":
            ib = FunctionCall("current", (b, e)); ic = FunctionCall("current", (c, e)); vbe = FunctionCall("voltage", (b, e)); vce = FunctionCall("voltage", (c, e))
            if state == NPNRegion.ACTIVE:
                equations = [Equation(vbe, Number(vbe_on)), Equation(ic, Binary(Number(beta), "*", ib))]
            elif state == NPNRegion.SATURATION:
                equations = [Equation(vbe, Number(vbe_on)), Equation(vce, Number(vce_sat))]
            else:
                equations = [Equation(ib, Number(0.0)), Equation(ic, Number(0.0))]
        else:
            ib = FunctionCall("current", (e, b)); ic = FunctionCall("current", (e, c)); veb = FunctionCall("voltage", (e, b)); vec = FunctionCall("voltage", (e, c))
            if state == PNPRegion.ACTIVE:
                equations = [Equation(veb, Number(vbe_on)), Equation(ic, Binary(Number(beta), "*", ib))]
            elif state == PNPRegion.SATURATION:
                equations = [Equation(veb, Number(vbe_on)), Equation(vec, Number(vce_sat))]
            else:
                equations = [Equation(ib, Number(0.0)), Equation(ic, Number(0.0))]
        components.append(replace(component, equations=equations))
    return SimulationModel(components=components, nodes=set(model.nodes))


def _next_npn_state(component, state, result):
    ports = component.ports
    base, collector, emitter = ports.get("b"), ports.get("c"), ports.get("e")
    if not base or not collector or not emitter:
        raise SolverError(f"NPN transistor '{component.component_id}' must have b/c/e ports")
    vbe_on = _positive_parameter(component, "Vbe", "Vbe must be greater than zero")
    vce_sat = _positive_parameter(component, "VceSat", "VceSat must be greater than zero")
    vbe = result.node_voltage(base) - result.node_voltage(emitter)
    vce = result.node_voltage(collector) - result.node_voltage(emitter)
    ib = result.component_current(component.name, base, emitter)
    if state == NPNRegion.CUTOFF:
        return NPNRegion.ACTIVE if vbe > vbe_on + TRANSISTOR_VOLTAGE_TOLERANCE else state
    if state == NPNRegion.ACTIVE:
        if vbe < vbe_on - TRANSISTOR_VOLTAGE_TOLERANCE or ib < -TRANSISTOR_CURRENT_TOLERANCE:
            return NPNRegion.CUTOFF
        if vce < vce_sat - TRANSISTOR_VOLTAGE_TOLERANCE:
            return NPNRegion.SATURATION
        return state
    if vbe < vbe_on - TRANSISTOR_VOLTAGE_TOLERANCE or ib < -TRANSISTOR_CURRENT_TOLERANCE:
        return NPNRegion.CUTOFF
    return NPNRegion.ACTIVE if vce > vce_sat + TRANSISTOR_VOLTAGE_TOLERANCE else state


def _next_pnp_state(component, state, result):
    ports = component.ports
    base, collector, emitter = ports.get("b"), ports.get("c"), ports.get("e")
    if not base or not collector or not emitter:
        raise SolverError(f"PNP transistor '{component.component_id}' must have b/c/e ports")
    vbe_on = _positive_parameter(component, "Vbe", "Vbe must be greater than zero")
    vce_sat = _positive_parameter(component, "VceSat", "VceSat must be greater than zero")
    veb = result.node_voltage(emitter) - result.node_voltage(base)
    vec = result.node_voltage(emitter) - result.node_voltage(collector)
    ib = result.component_current(component.name, emitter, base)
    if state == PNPRegion.CUTOFF:
        return PNPRegion.ACTIVE if veb > vbe_on + TRANSISTOR_VOLTAGE_TOLERANCE else state
    if state == PNPRegion.ACTIVE:
        if veb < vbe_on - TRANSISTOR_VOLTAGE_TOLERANCE or ib < -TRANSISTOR_CURRENT_TOLERANCE:
            return PNPRegion.CUTOFF
        if vec < vce_sat - TRANSISTOR_VOLTAGE_TOLERANCE:
            return PNPRegion.SATURATION
        return state
    if veb < vbe_on - TRANSISTOR_VOLTAGE_TOLERANCE or ib < -TRANSISTOR_CURRENT_TOLERANCE:
        return PNPRegion.CUTOFF
    return PNPRegion.ACTIVE if vec > vce_sat + TRANSISTOR_VOLTAGE_TOLERANCE else state


def _positive_parameter(component, name, message):
    value = float(component.parameters.get(name, 0.0))
    if value <= 0:
        raise SolverError(f"{component.component_type} '{component.component_id}': {message}")
    return value
