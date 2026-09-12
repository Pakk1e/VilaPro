from __future__ import annotations

from worlds.math import Binary, FunctionCall, Number, Variable

from .binding import bind_component_equations
from .equations import EquationSystem, SimulationEquation
from .model import SimulationModel
from .solver import BranchCurrent


class NetworkError(Exception):
    pass


def build_network_equation_system(model: SimulationModel) -> EquationSystem:
    """Build one global electrical equation system, including multiterminal devices."""
    system = EquationSystem(equations=[])
    for component in model.components:
        for bound in bind_component_equations(component):
            equation = bound.equation
            system.add(SimulationEquation(expression=Binary(left=_normalize_expression(equation.left, component), operator="-", right=_normalize_expression(equation.right, component))))
    for node in sorted(model.nodes):
        if node != "ground": system.add(SimulationEquation(expression=_build_kcl_equation(model, node)))
    return system


def _normalize_expression(expression, component):
    if isinstance(expression, Number): return expression
    if isinstance(expression, Variable): return expression
    if isinstance(expression, FunctionCall):
        if expression.name == "voltage" and len(expression.arguments) == 2:
            return Binary(left=_normalize_node(expression.arguments[0]), operator="-", right=_normalize_node(expression.arguments[1]))
        if expression.name == "current" and len(expression.arguments) == 2:
            return BranchCurrent(name="current", arguments=(_normalize_current_node(expression.arguments[0]), _normalize_current_node(expression.arguments[1])), component=component.name)
        raise NetworkError(f"Unsupported physical function: {expression.name}")
    if isinstance(expression, Binary):
        return Binary(left=_normalize_expression(expression.left, component), operator=expression.operator, right=_normalize_expression(expression.right, component))
    raise NetworkError(f"Unsupported network expression: {expression!r}")


def _normalize_node(expression):
    if not isinstance(expression, Variable): raise NetworkError(f"Expected node variable, got: {expression!r}")
    if expression.name == "ground": return Number(0.0)
    return Variable(f"V_{expression.name}")


def _normalize_current_node(expression):
    if not isinstance(expression, Variable): raise NetworkError(f"Expected node variable, got: {expression!r}")
    return Variable(expression.name)


def _build_kcl_equation(model: SimulationModel, node: str):
    terms = []
    for component in model.components:
        for current in _component_current_branches(component):
            first_node = current.arguments[0].name
            second_node = current.arguments[1].name
            if node == first_node: terms.append(current)
            elif node == second_node: terms.append(Binary(left=Number(-1.0), operator="*", right=current))
    if not terms: return Number(0.0)
    expression = terms[0]
    for term in terms[1:]: expression = Binary(left=expression, operator="+", right=term)
    return expression


def _component_current_branches(component):
    if len(component.ports) == 2 and "p" in component.ports and "n" in component.ports:
        return [BranchCurrent(name="current", arguments=(Variable(component.ports["p"]), Variable(component.ports["n"])), component=component.name)]

    # NPN BJT uses two independent internal current branches: base→emitter
    # and collector→emitter. Emitter current is their KCL sum.
    if component.component_type == "NPNTransistor":
        base, collector, emitter = component.ports.get("b"), component.ports.get("c"), component.ports.get("e")
        if not base or not collector or not emitter: raise NetworkError(f"Component '{component.name}' must define b/c/e ports")
        return [
            BranchCurrent(name="current", arguments=(Variable(base), Variable(emitter)), component=component.name),
            BranchCurrent(name="current", arguments=(Variable(collector), Variable(emitter)), component=component.name),
        ]

    branches = []
    seen = set()
    for bound in bind_component_equations(component):
        for expression in (bound.equation.left, bound.equation.right):
            for current in _find_current_calls(expression, component.name):
                if current not in seen:
                    seen.add(current); branches.append(current)
    if not branches: raise NetworkError(f"Component '{component.name}' does not expose any independent current branches")
    return branches


def _find_current_calls(expression, component_name):
    if isinstance(expression, FunctionCall):
        if expression.name == "current" and len(expression.arguments) == 2:
            first, second = expression.arguments
            if isinstance(first, Variable) and isinstance(second, Variable):
                yield BranchCurrent(name="current", arguments=(Variable(first.name), Variable(second.name)), component=component_name)
            return
        return
    if isinstance(expression, Binary):
        yield from _find_current_calls(expression.left, component_name)
        yield from _find_current_calls(expression.right, component_name)
