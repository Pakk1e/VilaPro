from __future__ import annotations

from worlds.math import (
    Binary,
    Number,
    Unary,
    Variable,
    Expression,
)

from worlds.units import (
    DIMENSIONLESS,
    Unit,
)

from .units import UnitEnvironment, UnitError


class UnitEvaluationError(Exception):
    pass


class UnitEvaluator:
    """
    Evaluates a mathematical expression as a physical unit.

    Examples:

        V
        Ohm
        V / A
        A * s
        V ^ 2
        1000 * Ohm
    """

    def __init__(self, environment: UnitEnvironment):
        self.environment = environment

    def evaluate(self, expression: Expression) -> Unit:
        if isinstance(expression, Variable):
            return self.environment.require(expression.name)

        if isinstance(expression, Number):
            return Unit(
                name=str(expression.value),
                symbol=str(expression.value),
                dimension=DIMENSIONLESS,
                scale=expression.value,
            )

        if isinstance(expression, Unary):
            operand = self.evaluate(expression.operand)

            if expression.operator == "+":
                return operand

            if expression.operator == "-":
                return Unit(
                    name=f"-{operand.name}",
                    symbol=f"-{operand.symbol}",
                    dimension=operand.dimension,
                    scale=-operand.scale,
                )

            raise UnitEvaluationError(
                f"Unsupported unary operator: "
                f"{expression.operator}"
            )

        if isinstance(expression, Binary):
            left = self.evaluate(expression.left)
            right = self.evaluate(expression.right)

            if expression.operator == "*":
                return left * right

            if expression.operator == "/":
                return left / right

            if expression.operator == "^":
                if not isinstance(expression.right, Number):
                    raise UnitEvaluationError(
                        "Unit exponent must be a number"
                    )

                exponent = expression.right.value

                if not exponent.is_integer():
                    raise UnitEvaluationError(
                        "Unit exponent must be an integer"
                    )

                return left ** int(exponent)

            raise UnitEvaluationError(
                f"Unsupported binary operator: "
                f"{expression.operator}"
            )

        raise UnitEvaluationError(
            f"Unsupported expression: "
            f"{type(expression).__name__}"
        )
