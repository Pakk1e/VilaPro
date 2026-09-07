from __future__ import annotations

from worlds.math import (
    Binary,
    FunctionCall,
    Number,
    Variable,
)

from .binding import bind_component_equations
from .equations import (
    EquationSystem,
    SimulationEquation,
)
from .model import SimulationModel
from .solver import BranchCurrent


class NetworkError(Exception):
    pass


def build_network_equation_system(
    model: SimulationModel,
) -> EquationSystem:
    """
    Build one global equation system for the complete simulation model.

    Voltage is represented by node potentials:
        voltage(a, b) = V(a) - V(b)

    Current is a component-specific branch-current unknown. The
    public representation remains current(a, b), but the internal
    unknown also carries the component identity.

    Ground has a fixed potential of zero.
    """

    system = EquationSystem(equations=[])

    for component in model.components:
        bound_equations = bind_component_equations(component)

        for bound in bound_equations:
            equation = bound.equation

            expression = Binary(
                left=_normalize_expression(equation.left, component),
                operator="-",
                right=_normalize_expression(equation.right, component),
            )

            system.add(
                SimulationEquation(expression=expression)
            )

    for node in sorted(model.nodes):
        if node == "ground":
            continue

        system.add(
            SimulationEquation(
                expression=_build_kcl_equation(model, node)
            )
        )

    return system


def _normalize_expression(expression, component):
    if isinstance(expression, Number):
        return expression

    if isinstance(expression, Variable):
        return expression

    if isinstance(expression, FunctionCall):
        if expression.name == "voltage" and len(expression.arguments) == 2:
            first = _normalize_node(expression.arguments[0])
            second = _normalize_node(expression.arguments[1])

            return Binary(
                left=first,
                operator="-",
                right=second,
            )

        if expression.name == "current" and len(expression.arguments) == 2:
            first = _normalize_current_node(expression.arguments[0])
            second = _normalize_current_node(expression.arguments[1])

            return BranchCurrent(
                name="current",
                arguments=(first, second),
                component=component.name,
            )

        raise NetworkError(
            f"Unsupported physical function: {expression.name}"
        )

    if isinstance(expression, Binary):
        return Binary(
            left=_normalize_expression(expression.left, component),
            operator=expression.operator,
            right=_normalize_expression(expression.right, component),
        )

    raise NetworkError(
        f"Unsupported network expression: {expression!r}"
    )


def _normalize_node(expression):
    if not isinstance(expression, Variable):
        raise NetworkError(
            f"Expected node variable, got: {expression!r}"
        )

    if expression.name == "ground":
        return Number(0.0)

    return Variable(f"V_{expression.name}")


def _normalize_current_node(expression):
    if not isinstance(expression, Variable):
        raise NetworkError(
            f"Expected node variable, got: {expression!r}"
        )

    return Variable(expression.name)


def _build_kcl_equation(model: SimulationModel, node: str):
    terms = []

    for component in model.components:
        if len(component.ports) != 2:
            raise NetworkError(
                "KCL currently supports two-port components only"
            )

        if "p" not in component.ports or "n" not in component.ports:
            raise NetworkError(
                f"Component '{component.name}' must define p/n ports"
            )

        first_node = component.ports["p"]
        second_node = component.ports["n"]

        current = BranchCurrent(
            name="current",
            arguments=(
                Variable(first_node),
                Variable(second_node),
            ),
            component=component.name,
        )

        if node == first_node:
            terms.append(current)

        elif node == second_node:
            terms.append(
                Binary(
                    left=Number(-1.0),
                    operator="*",
                    right=current,
                )
            )

    if not terms:
        return Number(0.0)

    expression = terms[0]

    for term in terms[1:]:
        expression = Binary(
            left=expression,
            operator="+",
            right=term,
        )

    return expression
