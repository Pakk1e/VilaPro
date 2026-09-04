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

from .binding import BoundEquation


class EquationSystemError(Exception):
    pass


@dataclass(frozen=True)
class SimulationEquation:
    """
    Normalized equation used by the simulation layer.

    The equation is represented as:

        left - right = 0

    This gives the solver one consistent form to work with.
    """

    expression: object


@dataclass
class EquationSystem:
    equations: list[SimulationEquation]

    def add(self, equation: SimulationEquation):
        self.equations.append(equation)


def build_equation_system(
    bound_equations: list[BoundEquation],
) -> EquationSystem:
    """
    Convert bound component equations into normalized
    simulation equations.
    """

    system = EquationSystem(equations=[])

    for bound in bound_equations:
        equation = bound.equation

        normalized = Binary(
            left=equation.left,
            operator="-",
            right=equation.right,
        )

        system.add(
            SimulationEquation(
                expression=normalized,
            )
        )

    return system


def collect_unknowns(
    system: EquationSystem,
) -> list[FunctionCall]:
    """
    Collect physical function calls that represent simulation
    unknowns.

    Function calls such as voltage(node_a, node_b) and
    current(node_a, node_b) are retained as structured AST
    objects rather than flattened into strings.
    """

    unknowns: list[FunctionCall] = []
    seen: set[FunctionCall] = set()

    for equation in system.equations:
        _collect_function_calls(
            equation.expression,
            unknowns,
            seen,
        )

    return unknowns


def _collect_function_calls(
    expression,
    unknowns: list[FunctionCall],
    seen: set[FunctionCall],
):
    if isinstance(expression, FunctionCall):
        if expression not in seen:
            seen.add(expression)
            unknowns.append(expression)

        for argument in expression.arguments:
            _collect_function_calls(
                argument,
                unknowns,
                seen,
            )

        return

    if isinstance(expression, Binary):
        _collect_function_calls(
            expression.left,
            unknowns,
            seen,
        )
        _collect_function_calls(
            expression.right,
            unknowns,
            seen,
        )
        return

    if isinstance(expression, Unary):
        _collect_function_calls(
            expression.operand,
            unknowns,
            seen,
        )
