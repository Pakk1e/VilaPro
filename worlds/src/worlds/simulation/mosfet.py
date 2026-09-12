from __future__ import annotations

from dataclasses import replace
from enum import Enum

from worlds.math import Binary, Equation, FunctionCall, Number, Variable

from .model import SimulationComponent, SimulationModel
from .network import build_network_equation_system
from .solver import SimulationResult, SimulationSolver, SolverError


class MosfetConvergenceError(SolverError):
    """Raised when a MOSFET switching state cannot be resolved."""


class NMOSRegion(str, Enum):
    OFF = "off"
    ON = "on"


class PMOSRegion(str, Enum):
    OFF = "off"
    ON = "on"


MOSFET_MAX_ITERATIONS = 20
MOSFET_VOLTAGE_TOLERANCE = 1e-9


def has_mosfets(model: SimulationModel) -> bool:
    return any(component.component_type in {"NMOS", "PMOS"} for component in model.components)


def solve_mosfet_network(model: SimulationModel, *, known: dict[object, float] | None = None) -> SimulationResult:
    """Solve enhancement NMOS/PMOS devices as voltage-controlled resistive switches.

    NMOS: off => I_D = 0; on => V_DS = I_DS * RdsOn when V_GS >= Vth.
    PMOS: off => I_SD = 0; on => V_SD = I_SD * RdsOn when V_SG >= Vth.

    Gate current is idealized as zero. This is an educational large-signal
    switch model; channel-length modulation, body effect, capacitances and
    detailed ohmic/saturation equations are intentionally out of scope.
    """
    # Starting ON avoids an entirely disconnected output net in complementary
    # switch circuits such as a CMOS inverter. The first solved state then
    # immediately transitions to the physically appropriate state.
    states = {
        component.name: (NMOSRegion.ON if component.component_type == "NMOS" else PMOSRegion.ON)
        for component in model.components
        if component.component_type in {"NMOS", "PMOS"}
    }
    base_known = dict(known or {})

    for _ in range(MOSFET_MAX_ITERATIONS):
        result = _solve_state(model, states, base_known)
        next_states = dict(states)
        for component in model.components:
            if component.component_type == "NMOS":
                next_states[component.name] = _next_nmos_state(component, result)
            elif component.component_type == "PMOS":
                next_states[component.name] = _next_pmos_state(component, result)
        if next_states == states:
            return result
        states = next_states
    raise MosfetConvergenceError("MOSFET operating state did not converge")


def _solve_state(model: SimulationModel, states, known):
    linear_model = _apply_mosfet_states(model, states)
    equation_system = build_network_equation_system(linear_model)
    solved = SimulationSolver().solve(equation_system, known=known)
    return SimulationResult(values=solved.values, instances={component.name: component for component in model.components})


def _apply_mosfet_states(model: SimulationModel, states) -> SimulationModel:
    components: list[SimulationComponent] = []
    for component in model.components:
        if component.component_type not in {"NMOS", "PMOS"}:
            components.append(component)
            continue
        vth = _positive_parameter(component, "Vth", "Vth must be greater than zero")
        rds_on = _positive_parameter(component, "RdsOn", "RdsOn must be greater than zero")
        gate, drain, source = (Variable("g"), Variable("d"), Variable("s"))
        state = states[component.name]
        gate_current = FunctionCall("current", (gate, source))
        if component.component_type == "NMOS":
            channel_current = FunctionCall("current", (drain, source))
            channel_voltage = FunctionCall("voltage", (drain, source))
            channel_equation = Equation(channel_voltage, Binary(Number(rds_on), "*", channel_current)) if state == NMOSRegion.ON else Equation(channel_current, Number(0.0))
        else:
            channel_current = FunctionCall("current", (source, drain))
            channel_voltage = FunctionCall("voltage", (source, drain))
            channel_equation = Equation(channel_voltage, Binary(Number(rds_on), "*", channel_current)) if state == PMOSRegion.ON else Equation(channel_current, Number(0.0))
        components.append(replace(component, equations=[Equation(gate_current, Number(0.0)), channel_equation]))
    return SimulationModel(components=components, nodes=set(model.nodes))


def _next_nmos_state(component, result):
    ports = _require_ports(component)
    vgs = result.node_voltage(ports["g"]) - result.node_voltage(ports["s"])
    vth = _positive_parameter(component, "Vth", "Vth must be greater than zero")
    return NMOSRegion.ON if vgs >= vth - MOSFET_VOLTAGE_TOLERANCE else NMOSRegion.OFF


def _next_pmos_state(component, result):
    ports = _require_ports(component)
    vsg = result.node_voltage(ports["s"]) - result.node_voltage(ports["g"])
    vth = _positive_parameter(component, "Vth", "Vth must be greater than zero")
    return PMOSRegion.ON if vsg >= vth - MOSFET_VOLTAGE_TOLERANCE else PMOSRegion.OFF


def _require_ports(component):
    ports = component.ports
    if not all(ports.get(port) for port in ("g", "d", "s")):
        raise SolverError(f"{component.component_type} '{component.component_id}' must have g/d/s ports")
    return ports


def _positive_parameter(component, name, message):
    value = float(component.parameters.get(name, 0.0))
    if value <= 0:
        raise SolverError(f"{component.component_type} '{component.component_id}': {message}")
    return value
