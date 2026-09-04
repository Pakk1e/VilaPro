from __future__ import annotations

import math

from .ast import (
    Binary,
    Expression,
    FunctionCall,
    Number,
    Unary,
    Variable,
)


class EvaluationError(Exception):
    pass


class Evaluator:
    def __init__(self, variables: dict[str, float] | None = None):
        self.variables = variables or {}

    def evaluate(self, expression: Expression) -> float:
        if isinstance(expression, Number):
            return expression.value

        if isinstance(expression, Variable):
            if expression.name not in self.variables:
                raise EvaluationError(
                    f"Unknown variable: {expression.name}"
                )

            return self.variables[expression.name]

        if isinstance(expression, Unary):
            value = self.evaluate(expression.operand)

            if expression.operator == "+":
                return value

            if expression.operator == "-":
                return -value

            raise EvaluationError(
                f"Unknown unary operator: "
                f"{expression.operator}"
            )

        if isinstance(expression, Binary):
            left = self.evaluate(expression.left)
            right = self.evaluate(expression.right)

            if expression.operator == "+":
                return left + right

            if expression.operator == "-":
                return left - right

            if expression.operator == "*":
                return left * right

            if expression.operator == "/":
                return left / right

            if expression.operator == "^":
                return left ** right

            raise EvaluationError(
                f"Unknown binary operator: "
                f"{expression.operator}"
            )

        if isinstance(expression, FunctionCall):
            return self._evaluate_function(expression)

        raise EvaluationError(
            f"Unsupported expression: {type(expression).__name__}"
        )

    def _evaluate_function(
        self,
        expression: FunctionCall,
    ) -> float:
        name = expression.name
        arguments = [
            self.evaluate(argument)
            for argument in expression.arguments
        ]

        functions = {
            "sqrt": math.sqrt,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "exp": math.exp,
            "log": math.log,
            "abs": abs,
        }

        function = functions.get(name)

        if function is None:
            raise EvaluationError(
                f"Unknown function: {name}"
            )

        return function(*arguments)
