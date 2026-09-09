from __future__ import annotations

from worlds.math import MathParser

from .dimensions import (
    DimensionError,
    DimensionEvaluator,
    create_si_dimension_environment,
)
from .types import PortType, Symbol, SymbolKind, TypeEnvironment
from .units import UnitEnvironment, UnitError
from .physical import PhysicalFunctionRegistry, create_electrical_world_registry, create_world_physical_function_registry
from .component import ComponentSemanticAnalyzer


class WorldSemanticError(Exception):
    pass


def _same_dimension(left, right) -> bool:
    """Compare physical dimensions by their SI exponent vector."""
    fields = (
        "length",
        "mass",
        "time",
        "current",
        "temperature",
        "amount",
        "luminosity",
    )
    return all(
        getattr(left, field, None) == getattr(right, field, None)
        for field in fields
    )


class WorldSemanticAnalyzer:
    """
    Builds the semantic environment for a parsed VDL World.

    Quantity dimensions may reference other quantities in any
    declaration order.

    Each quantity may also declare a physical unit. The unit
    must have the same physical dimension as the quantity.
    """

    def __init__(self, world):
        self.world = world
        self.dimensions = create_si_dimension_environment()
        self.units = UnitEnvironment()
        self.types = TypeEnvironment()
        self.functions = PhysicalFunctionRegistry()
        self._quantity_definitions = {
            quantity.name: quantity
            for quantity in world.quantities
        }
        self._resolved_quantities = {}
        self._resolving = []
        self._components = {}

    def analyze(self):
        for quantity in self.world.quantities:
            self._resolve_quantity(quantity.name)
        self._register_port_types()
        self._register_physical_functions()
        self._register_components()
        return self

    def _resolve_quantity(self, name: str):
        if name in self._resolved_quantities:
            return self._resolved_quantities[name].dimension

        built_in = self.dimensions.lookup(name)
        if built_in is not None:
            return built_in

        quantity = self._quantity_definitions.get(name)
        if quantity is None:
            raise WorldSemanticError(f"Unknown quantity or dimension: {name}")

        if name in self._resolving:
            cycle_start = self._resolving.index(name)
            cycle = self._resolving[cycle_start:] + [name]
            raise WorldSemanticError("Circular quantity dependency: " + " -> ".join(cycle))

        self._resolving.append(name)
        try:
            expression = MathParser(quantity.dimension).parse_expression()
            expression = self._resolve_expression(expression)
            dimension = DimensionEvaluator(self.dimensions).evaluate(expression)

            unit = None
            if quantity.unit is not None:
                try:
                    unit = self.units.require(quantity.unit)
                except UnitError as error:
                    raise WorldSemanticError(f"Cannot resolve unit of {name}: {error}") from error

                if not _same_dimension(unit.dimension, dimension):
                    raise WorldSemanticError(
                        f"Unit mismatch for {name}: unit {unit.symbol!r} has dimension "
                        f"{unit.dimension}, expected {dimension}"
                    )

            self.dimensions.define(name, dimension)
            symbol = Symbol(name=name, kind=SymbolKind.QUANTITY, dimension=dimension, unit=unit)
            self._resolved_quantities[name] = symbol
            self.types.define(symbol)
            return dimension
        except DimensionError as error:
            raise WorldSemanticError(f"Cannot resolve dimension of {name}: {error}") from error
        finally:
            self._resolving.pop()

    def _resolve_expression(self, expression):
        from worlds.math import Binary, FunctionCall, Number, Unary, Variable
        if isinstance(expression, Number):
            return expression
        if isinstance(expression, Variable):
            dimension = self._resolve_quantity(expression.name)
            name = f"__resolved_{expression.name}"
            if self.dimensions.lookup(name) is None:
                self.dimensions.define(name, dimension)
            return Variable(name)
        if isinstance(expression, Unary):
            return Unary(operator=expression.operator, operand=self._resolve_expression(expression.operand))
        if isinstance(expression, Binary):
            return Binary(left=self._resolve_expression(expression.left), operator=expression.operator, right=self._resolve_expression(expression.right))
        if isinstance(expression, FunctionCall):
            return FunctionCall(name=expression.name, arguments=tuple(self._resolve_expression(argument) for argument in expression.arguments))
        return expression

    def _register_port_types(self):
        for port_type in self.world.port_types:
            physical_type = PortType(port_type.name)
            self.types.define(Symbol(name=port_type.name, kind=SymbolKind.TYPE, port_type=physical_type))

    def _register_physical_functions(self):
        port_types = {
            symbol.name: symbol.port_type
            for symbol in self.types.symbols()
            if symbol.kind == SymbolKind.TYPE and symbol.port_type is not None
        }
        self.functions = create_world_physical_function_registry(
            quantities=self._resolved_quantities,
            port_types=port_types,
            factories=(create_electrical_world_registry,),
        )

    def _register_components(self):
        for component in self.world.components:
            self.types.define(Symbol(name=component.name, kind=SymbolKind.COMPONENT))
            analyzer = ComponentSemanticAnalyzer(component, self.types, self.functions).analyze()
            self._components[component.name] = analyzer

    def dimension_of(self, quantity_name: str):
        return self._resolve_quantity(quantity_name)

    def quantity_symbol(self, quantity_name: str):
        self._resolve_quantity(quantity_name)
        return self._resolved_quantities[quantity_name]

    def component(self, component_name: str):
        try:
            return self._components[component_name]
        except KeyError:
            raise WorldSemanticError(f"Unknown component: {component_name}")
