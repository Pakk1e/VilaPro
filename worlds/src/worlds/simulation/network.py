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


class NetworkError(Exception):
    pass


def build_network_equation_system(
    model: SimulationModel,
) -> EquationSystem:
    """
    Build one global equation system for the complete
    simulation model.

    Voltage is represented by node potentials:

        voltage(a, b) = V(a) - V(b)

    Current remains a branch-current unknown:

        current(a, b)

    Ground has a fixed potential of zero.
    """

    system = EquationSystem(equations=[])

    # --------------------------------------------------
    # Component equations
    # --------------------------------------------------

    for component in model.components:
        bound_equations = bind_component_equations(
            component
        )

        for bound in bound_equations:
            equation = bound.equation

            expression = Binary(
                left=_normalize_expression(
                    equation.left,
                ),
                operator="-",
                right=_normalize_expression(
                    equation.right,
                ),
            )

            system.add(
                SimulationEquation(
                    expression=expression,
                )
            )

    # --------------------------------------------------
    # KCL equations
    # --------------------------------------------------

    for node in sorted(model.nodes):
        if node == "ground":
            continue

        system.add(
            SimulationEquation(
                expression=_build_kcl_equation(
                    model,
                    node,
                )
            )
        )

    return system


def _normalize_expression(expression):
    """
    Convert physical network expressions into solver variables.

    voltage(a, b)
        -> V(a) - V(b)

    current(a, b)
        -> current(a, b)

    Node voltage is therefore not an independent unknown for
    every pair of nodes.
    """

    if isinstance(expression, Number):
        return expression

    if isinstance(expression, Variable):
        return expression

    if isinstance(expression, FunctionCall):

        if (
            expression.name == "voltage"
            and len(expression.arguments) == 2
        ):
            first = _normalize_node(
                expression.arguments[0]
            )

            second = _normalize_node(
                expression.arguments[1]
            )

            return Binary(
                left=first,
                operator="-",
                right=second,
            )

        if expression.name == "current":
            return FunctionCall(
                name=expression.name,
                arguments=tuple(
                    _normalize_current_node(argument)
                    for argument in expression.arguments
                ),
            )

        raise NetworkError(
            f"Unsupported physical function: "
            f"{expression.name}"
        )

    if isinstance(expression, Binary):
        return Binary(
            left=_normalize_expression(
                expression.left,
            ),
            operator=expression.operator,
            right=_normalize_expression(
                expression.right,
            ),
        )

    raise NetworkError(
        f"Unsupported network expression: "
        f"{expression!r}"
    )


def _normalize_node(expression):
    """
    Convert a node reference into a solver variable.

    Ground is represented by numeric zero.
    """

    if not isinstance(expression, Variable):
        raise NetworkError(
            f"Expected node variable, got: "
            f"{expression!r}"
        )

    if expression.name == "ground":
        return Number(0.0)

    return Variable(
        f"V_{expression.name}"
    )

def _normalize_current_node(expression):
    """
    Keep a branch-current node reference as the actual
    simulation node name.

    Unlike voltage(), current() represents a branch-current
    unknown, so its arguments must NOT become V_node_*.
    """

    if not isinstance(expression, Variable):
        raise NetworkError(
            f"Expected node variable, got: "
            f"{expression!r}"
        )

    return Variable(expression.name)


def _build_kcl_equation(
    model: SimulationModel,
    node: str,
):
    """
    Build a KCL equation for one node.

    For a two-port component:

        current(a, b)

    means current flowing from a to b.

    Therefore:

        at node a -> +current(a, b)
        at node b -> -current(a, b)
    """

    terms = []

    for component in model.components:
        port_items = list(component.ports.items())

        if len(port_items) != 2:
            raise NetworkError(
                "KCL currently supports two-port components only"
            )

        (_, first_node), (_, second_node) = port_items

        if node == first_node:
            terms.append(
                FunctionCall(
                    name="current",
                    arguments=(
                        Variable(first_node),
                        Variable(second_node),
                    ),
                )
            )

        elif node == second_node:
            terms.append(
                Binary(
                    left=Number(-1.0),
                    operator="*",
                    right=FunctionCall(
                        name="current",
                        arguments=(
                            Variable(first_node),
                            Variable(second_node),
                        ),
                    ),
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