from __future__ import annotations

from dataclasses import replace

from worlds.math import Binary, Equation, FunctionCall, Number, Variable

from .model import SimulationComponent, SimulationModel
from .solver import SimulationResult, SimulationSolver, SolverError
from .network import build_network_equation_system


class DiodeConvergenceError(SolverError):
    """Raised when the piecewise-linear diode state cannot be resolved."""


DIODE_MAX_ITERATIONS = 50
DIODE_VOLTAGE_TOLERANCE = 1e-9
DIODE_CURRENT_TOLERANCE = 1e-12


def has_diodes(model: SimulationModel) -> bool:
    return any(component.component_type == "Diode" for component in model.components)


def solve_diode_network(model: SimulationModel, *, known: dict[object, float] | None = None) -> SimulationResult:
    """Solve a circuit containing piecewise-linear diodes using an active-set iteration.

    The diode model is intentionally explicit and deterministic:
    OFF: i = 0
    ON:  v = Vf + i * Ron

    This keeps the physical component definition separate from the numerical
    method while allowing the existing linear network solver to be reused.
    """
    states = {component.name: False for component in model.components if component.component_type == "Diode"}
    base_known = dict(known or {})
    last_result = None

    for _ in range(DIODE_MAX_ITERATIONS):
        linear_model = _apply_diode_states(model, states)
        equation_system = build_network_equation_system(linear_model)
        solved = SimulationSolver().solve(equation_system, known=base_known)
        result = SimulationResult(values=solved.values, instances={component.name: component for component in model.components})
        next_states = dict(states)

        for component in model.components:
            if component.component_type != "Diode":
                continue
            p_node, n_node = component.ports.get("p"), component.ports.get("n")
            if p_node is None or n_node is None:
                raise SolverError(f"Diode '{component.display_name}' must have p/n ports")
            voltage = result.node_voltage(p_node) - result.node_voltage(n_node)
            current = result.component_current(component.name, p_node, n_node)
            forward_voltage = float(component.parameters.get("Vf", 0.7))
            on_resistance = float(component.parameters.get("Ron", 1.0))
            if forward_voltage < 0:
                raise SolverError(f"Diode '{component.component_id}' must have Vf >= 0")
            if on_resistance < 0:
                raise SolverError(f"Diode '{component.component_id}' must have Ron >= 0")

            if states[component.name]:
                if voltage < forward_voltage - DIODE_VOLTAGE_TOLERANCE or current < -DIODE_CURRENT_TOLERANCE:
                    next_states[component.name] = False
            elif voltage > forward_voltage + DIODE_VOLTAGE_TOLERANCE:
                next_states[component.name] = True

        if next_states == states:
            return result
        states = next_states
        last_result = result

    raise DiodeConvergenceError("Diode operating point did not converge")


def _apply_diode_states(model: SimulationModel, states: dict[str, bool]) -> SimulationModel:
    components: list[SimulationComponent] = []
    for component in model.components:
        if component.component_type != "Diode":
            components.append(component)
            continue
        forward_voltage = float(component.parameters.get("Vf", 0.7))
        on_resistance = float(component.parameters.get("Ron", 1.0))
        if forward_voltage < 0:
            raise SolverError(f"Diode '{component.component_id}' must have Vf >= 0")
        if on_resistance < 0:
            raise SolverError(f"Diode '{component.component_id}' must have Ron >= 0")
        if states.get(component.name, False):
            right = Binary(
                Number(forward_voltage),
                "+",
                Binary(
                    FunctionCall("current", (Variable("p"), Variable("n"))),
                    "*",
                    Number(on_resistance),
                ),
            )
            equation = Equation(FunctionCall("voltage", (Variable("p"), Variable("n"))), right)
        else:
            equation = Equation(FunctionCall("current", (Variable("p"), Variable("n"))), Number(0.0))
        components.append(replace(component, equations=[equation]))
    return SimulationModel(components=components, nodes=set(model.nodes))
