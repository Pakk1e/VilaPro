from __future__ import annotations

from worlds.math import (
    Binary,
    Expression,
    FunctionCall,
    Number,
    Unary,
    Variable,
)
from worlds.units import (
    AMOUNT,
    CURRENT,
    LENGTH,
    LUMINOSITY,
    MASS,
    TEMPERATURE,
    TIME,
)


class DimensionError(Exception):
    pass


class DimensionEnvironment:
    """
    Maps names to physical dimensions.

    Names can represent:
      - SI base dimensions
      - previously defined VDL quantities
    """

    def __init__(self):
        self._dimensions = {}

    def define(self, name: str, dimension):
        if name in self._dimensions:
            raise DimensionError(
                f"Dimension already defined: {name}"
            )

        self._dimensions[name] = dimension

    def lookup(self, name: str):
        return self._dimensions.get(name)

    def require(self, name: str):
        dimension = self.lookup(name)

        if dimension is None:
            raise DimensionError(
                f"Unknown dimension symbol: {name}"
            )

        return dimension


def create_si_dimension_environment() -> DimensionEnvironment:
    """
    Create the built-in SI base-dimension environment.

    These are dimensions, not physical quantities.
    """

    environment = DimensionEnvironment()

    environment.define("L", LENGTH)
    environment.define("M", MASS)
    environment.define("T", TIME)
    environment.define("I", CURRENT)
    environment.define("Theta", TEMPERATURE)
    environment.define("N", AMOUNT)
    environment.define("J", LUMINOSITY)

    return environment


class DimensionEvaluator:
    """
    Evaluate a Math AST as dimensional algebra.

    The result can be:
      - a Dimension
      - a float for dimensionless numeric expressions
    """

    def __init__(self, environment: DimensionEnvironment):
        self.environment = environment

    def evaluate(self, expression: Expression):

        if isinstance(expression, Number):
            return expression.value

        if isinstance(expression, Variable):
            return self.environment.require(expression.name)

        if isinstance(expression, Unary):
            value = self.evaluate(expression.operand)

            if expression.operator == "+":
                return value

            if expression.operator == "-":
                if isinstance(value, (int, float)):
                    return -value

                raise DimensionError(
                    "Unary minus cannot be applied to a dimension"
                )

            raise DimensionError(
                f"Unknown unary operator: {expression.operator}"
            )

        if isinstance(expression, Binary):
            left = self.evaluate(expression.left)
            right = self.evaluate(expression.right)

            return self._evaluate_binary(
                left,
                expression.operator,
                right,
            )

        if isinstance(expression, FunctionCall):
            raise DimensionError(
                f"Function {expression.name!r} "
                "is not supported in dimension expressions"
            )

        raise DimensionError(
            f"Unsupported expression: "
            f"{type(expression).__name__}"
        )

    def _evaluate_binary(self, left, operator, right):

        left_dimension = self._is_dimension(left)
        right_dimension = self._is_dimension(right)

        if operator in ("+", "-"):
            if left_dimension or right_dimension:

                if not (left_dimension and right_dimension):
                    raise DimensionError(
                        "Cannot combine a dimension with "
                        "a dimensionless value"
                    )

                if left != right:
                    raise DimensionError(
                        "Cannot add/subtract different dimensions: "
                        f"{left} and {right}"
                    )

                return left

            return (
                left + right
                if operator == "+"
                else left - right
            )

        if operator == "*":

            if left_dimension and right_dimension:
                return left * right

            if left_dimension:
                return left * self._require_integer(right)

            if right_dimension:
                return right * self._require_integer(left)

            return left * right

        if operator == "/":

            if left_dimension and right_dimension:
                return left / right

            if left_dimension:
                return left / self._require_integer(right)

            if right_dimension:
                raise DimensionError(
                    "Cannot divide a dimensionless value "
                    "by a dimension"
                )

            return left / right

        if operator == "^":

            if not left_dimension:
                return left ** right

            exponent = self._require_integer(right)

            return left ** exponent

        raise DimensionError(
            f"Unknown operator: {operator}"
        )

    @staticmethod
    def _is_dimension(value) -> bool:
        from worlds.units import Dimension

        return isinstance(value, Dimension)

    @staticmethod
    def _require_integer(value) -> int:
        if not isinstance(value, (int, float)):
            raise DimensionError(
                "Dimension exponent must be dimensionless"
            )

        if int(value) != value:
            raise DimensionError(
                "Dimension exponent must be an integer"
            )

        return int(value)
