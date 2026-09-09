from __future__ import annotations


from worlds.math import (
    Binary,
    Equation,
    FunctionCall,
    Number,
    Unary,
    Variable,
)
from worlds.units import Dimension, TIME

from .physical import PhysicalFunctionRegistry
from .types import PortType, Symbol, SymbolKind, TypeEnvironment


class ComponentSemanticError(Exception):
    pass


class ComponentSemanticAnalyzer:
    """
    Semantic environment for a single VDL component.

    Component-local names include:
        parameters
        ports
        physical functions
    """

    def __init__(
        self,
        component,
        global_environment: TypeEnvironment,
        physical_functions: PhysicalFunctionRegistry,
    ):
        self.component = component
        self.global_environment = global_environment
        self.environment = TypeEnvironment()
        self.functions = physical_functions

    def analyze(self):
        self._register_parameters()
        self._register_ports()
        self._register_function_symbols()
        self._validate_equations()

        return self

    def symbols(self):
        return self.environment.symbols()

    def _register_function_symbols(self):
        for signature in self.functions.functions():
            self.environment.define(
                Symbol(
                    name=signature.name,
                    kind=SymbolKind.FUNCTION,
                    dimension=signature.dimension,
                )
            )

    def _register_parameters(self):
        for parameter in self.component.parameters:
            symbol = self.global_environment.require(
                parameter.type_name
            )

            self.environment.define(
                Symbol(
                    name=parameter.name,
                    kind=SymbolKind.PARAMETER,
                    dimension=symbol.dimension,
                    unit=symbol.unit,
                )
            )

    def _register_ports(self):
        for port in self.component.ports:
            symbol = self.global_environment.lookup(
                port.type_name
            )

            if symbol is None:
                raise ComponentSemanticError(
                    f"Unknown port type: {port.type_name}"
                )

            if symbol.kind != SymbolKind.TYPE:
                raise ComponentSemanticError(
                    f"{port.type_name} is not a port type"
                )

            self.environment.define(
                Symbol(
                    name=port.name,
                    kind=SymbolKind.PORT,
                    port_type=symbol.port_type,
                )
            )

    def _validate_equations(self):
        for representation in self.component.representations:
            for equation in representation.equations:
                self._validate_equation(equation)

    def _validate_equation(self, equation: Equation):
        left_dimension = self._expression_dimension(
            equation.left
        )

        right_dimension = self._expression_dimension(
            equation.right
        )

        if left_dimension != right_dimension:
            raise ComponentSemanticError(
                "Equation dimension mismatch: "
                f"left={left_dimension}, "
                f"right={right_dimension}"
            )

    def _expression_dimension(
        self,
        expression,
    ) -> Dimension:

        if isinstance(expression, Number):
            return Dimension()

        if isinstance(expression, Variable):
            symbol = self.environment.lookup(
                expression.name
            )

            if symbol is None:
                raise ComponentSemanticError(
                    f"Unknown symbol: {expression.name}"
                )

            if symbol.dimension is None:
                raise ComponentSemanticError(
                    f"Symbol has no physical dimension: "
                    f"{expression.name}"
                )

            return symbol.dimension

        if isinstance(expression, Unary):
            return self._expression_dimension(
                expression.operand
            )

        if isinstance(expression, Binary):
            left = self._expression_dimension(
                expression.left
            )

            right = self._expression_dimension(
                expression.right
            )

            if expression.operator in ("+", "-"):
                if left != right:
                    raise ComponentSemanticError(
                        "Cannot add/subtract expressions "
                        "with different dimensions: "
                        f"{left} and {right}"
                    )

                return left

            if expression.operator == "*":
                return left * right

            if expression.operator == "/":
                return left / right

            if expression.operator == "^":
                if not isinstance(
                    expression.right,
                    Number,
                ):
                    raise ComponentSemanticError(
                        "Exponent must be a number"
                    )

                return left ** int(
                    expression.right.value
                )

            raise ComponentSemanticError(
                f"Unknown operator: "
                f"{expression.operator}"
            )

        if isinstance(expression, FunctionCall):
            if expression.name == "derivative":
                return self._derivative_dimension(expression)

            try:
                signature = self.functions.require(
                    expression.name
                )
            except KeyError:
                raise ComponentSemanticError(
                    f"Unknown function: "
                    f"{expression.name}"
                )

            if len(expression.arguments) != len(signature.arguments):
                raise ComponentSemanticError(
                    f"Function {expression.name} expects "
                    f"{len(signature.arguments)} arguments, got "
                    f"{len(expression.arguments)}"
                )

            for index, argument in enumerate(expression.arguments):
                expected_argument = signature.arguments[index]

                self._validate_function_argument(
                    expression.name,
                    index,
                    argument,
                    expected_argument,
                )

            return signature.dimension

        raise ComponentSemanticError(
            f"Unsupported expression: "
            f"{expression!r}"
        )

    def _derivative_dimension(
        self,
        expression: FunctionCall,
    ) -> Dimension:
        if len(expression.arguments) != 2:
            raise ComponentSemanticError(
                "Function derivative expects 2 arguments, got "
                f"{len(expression.arguments)}"
            )

        value_expression, variable_expression = expression.arguments

        if not isinstance(variable_expression, Variable):
            raise ComponentSemanticError(
                "Second argument of derivative must be the time variable"
            )

        if variable_expression.name not in ("time", "t"):
            raise ComponentSemanticError(
                "Second argument of derivative must be 'time' or 't'"
            )

        value_dimension = self._expression_dimension(
            value_expression
        )

        return value_dimension / TIME

    def _validate_function_argument(
        self,
        function_name: str,
        index: int,
        argument,
        expected_argument,
    ):
        if not isinstance(argument, Variable):
            raise ComponentSemanticError(
                f"Argument {index + 1} of "
                f"{function_name} must be a "
                f"{expected_argument.kind.name.lower()}"
            )

        symbol = self.environment.lookup(argument.name)

        if symbol is None:
            raise ComponentSemanticError(
                f"Unknown function argument: "
                f"{argument.name}"
            )

        if symbol.kind != expected_argument.kind:
            raise ComponentSemanticError(
                f"Argument {index + 1} of "
                f"{function_name} must be "
                f"{expected_argument.kind.name.lower()}, "
                f"got {symbol.kind.name.lower()}: "
                f"{argument.name}"
            )

        expected_port_type = expected_argument.port_type

        if expected_port_type is not None:
            if symbol.port_type != expected_port_type:
                actual = (
                    symbol.port_type.name
                    if symbol.port_type is not None
                    else "<none>"
                )

                raise ComponentSemanticError(
                    f"Argument {index + 1} of "
                    f"{function_name} must have port type "
                    f"{expected_port_type.name}, "
                    f"got {actual}: "
                    f"{argument.name}"
                )
