from __future__ import annotations

from worlds.math import (
    Binary,
    Equation,
    Expression,
    FunctionCall,
    Number,
    Unary,
    Variable,
)
from worlds.units import Dimension

from .types import Symbol, SymbolKind, TypeEnvironment


class SemanticError(Exception):
    pass


class SemanticAnalyzer:
    """
    Performs semantic and dimensional analysis of VDL.

    This layer connects:
        VDL AST
        Math AST
        physical types
        units
    """

    def __init__(self, environment: TypeEnvironment | None = None):
        self.environment = environment or TypeEnvironment()

    def check_equation(self, equation: Equation):
        left_dimension = self.infer_dimension(equation.left)
        right_dimension = self.infer_dimension(equation.right)

        if left_dimension != right_dimension:
            raise SemanticError(
                "Dimension mismatch in equation: "
                f"{left_dimension} != {right_dimension}"
            )

        return left_dimension

    def infer_dimension(
        self,
        expression: Expression,
    ) -> Dimension | None:

        if isinstance(expression, Number):
            return None

        if isinstance(expression, Variable):
            symbol = self.environment.lookup(expression.name)

            if symbol is None:
                raise SemanticError(
                    f"Unknown symbol: {expression.name}"
                )

            return symbol.dimension

        if isinstance(expression, Unary):
            return self.infer_dimension(expression.operand)

        if isinstance(expression, Binary):
            left = self.infer_dimension(expression.left)
            right = self.infer_dimension(expression.right)

            if expression.operator in ("+", "-"):
                if left != right:
                    raise SemanticError(
                        "Cannot add/subtract expressions "
                        f"with dimensions {left} and {right}"
                    )

                return left

            if expression.operator == "*":
                if left is None:
                    return right

                if right is None:
                    return left

                return left * right

            if expression.operator == "/":
                if left is None:
                    if right is None:
                        return None

                    return Dimension(
                        length=-right.length,
                        mass=-right.mass,
                        time=-right.time,
                        current=-right.current,
                        temperature=-right.temperature,
                        amount=-right.amount,
                        luminosity=-right.luminosity,
                    )

                if right is None:
                    return left

                return left / right

            if expression.operator == "^":
                if right is not None:
                    raise SemanticError(
                        "Exponent must be dimensionless"
                    )

                return left

            raise SemanticError(
                f"Unknown operator: {expression.operator}"
            )

        if isinstance(expression, FunctionCall):
            symbol = self.environment.lookup(expression.name)

            if symbol is None:
                raise SemanticError(
                    f"Unknown function: {expression.name}"
                )

            for argument in expression.arguments:
                self.infer_dimension(argument)

            return symbol.dimension

        raise SemanticError(
            f"Unsupported expression: "
            f"{type(expression).__name__}"
        )

    def define(
        self,
        name: str,
        kind: SymbolKind,
        dimension: Dimension | None = None,
        unit=None,
    ):
        self.environment.define(
            Symbol(
                name=name,
                kind=kind,
                dimension=dimension,
                unit=unit,
            )
        )
