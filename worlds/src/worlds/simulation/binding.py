from __future__ import annotations

from dataclasses import dataclass

from worlds.math import (
    Binary,
    Equation,
    FunctionCall,
    Number,
    Unary,
    Variable,
)

from .model import SimulationComponent


class SimulationBindingError(Exception):
    pass


@dataclass(frozen=True)
class BoundEquation:
    equation: Equation


def bind_component_equations(
    component: SimulationComponent,
) -> list[BoundEquation]:
    """
    Replace component-local ports and parameters with their
    concrete simulation values.

    Ports become node names.
    Parameters become numeric values.
    """

    return [
        BoundEquation(
            Equation(
                left=_bind_expression(
                    equation.left,
                    component,
                ),
                right=_bind_expression(
                    equation.right,
                    component,
                ),
            )
        )
        for equation in component.equations
    ]


def _bind_expression(
    expression,
    component: SimulationComponent,
):
    if isinstance(expression, Number):
        return expression

    if isinstance(expression, Variable):
        if expression.name in component.ports:
            return Variable(
                component.ports[expression.name]
            )

        if expression.name in component.parameters:
            return Number(
                component.parameters[expression.name]
            )

        raise SimulationBindingError(
            f"Unknown component variable: "
            f"{expression.name}"
        )

    if isinstance(expression, Unary):
        return Unary(
            operator=expression.operator,
            operand=_bind_expression(
                expression.operand,
                component,
            ),
        )

    if isinstance(expression, Binary):
        return Binary(
            left=_bind_expression(
                expression.left,
                component,
            ),
            operator=expression.operator,
            right=_bind_expression(
                expression.right,
                component,
            ),
        )

    if isinstance(expression, FunctionCall):
        return FunctionCall(
            name=expression.name,
            arguments=tuple(
                _bind_expression(
                    argument,
                    component,
                )
                for argument in expression.arguments
            ),
        )

    raise SimulationBindingError(
        f"Unsupported expression: "
        f"{expression!r}"
    )
