from __future__ import annotations

from dataclasses import dataclass

from worlds.units import Dimension

from .types import PortType, SymbolKind

from collections.abc import Callable


@dataclass(frozen=True)
class FunctionArgument:
    """
    Specification for one physical-function argument.

    kind:
        Semantic kind required for the argument.

    port_type:
        Required port type when the argument is a port.
        None means there is no port-type constraint.
    """

    kind: SymbolKind
    port_type: PortType | None = None


@dataclass(frozen=True)
class FunctionSignature:
    """
    Signature of a physical-domain function.
    """

    name: str
    arguments: tuple[FunctionArgument, ...]
    dimension: Dimension

PhysicalFunctionFactory = Callable[
    [dict, dict],
    "PhysicalFunctionRegistry",
]


class PhysicalFunctionRegistry:
    """
    Registry of built-in physical-domain functions.
    """

    def __init__(self):
        self._functions: dict[str, FunctionSignature] = {}

    def define(self, signature: FunctionSignature):
        if signature.name in self._functions:
            raise ValueError(
                f"Physical function already defined: "
                f"{signature.name}"
            )

        self._functions[signature.name] = signature

    def lookup(
        self,
        name: str,
    ) -> FunctionSignature | None:
        return self._functions.get(name)

    def require(
        self,
        name: str,
    ) -> FunctionSignature:
        signature = self.lookup(name)

        if signature is None:
            raise KeyError(
                f"Unknown physical function: {name}"
            )

        return signature

    def functions(self) -> list[FunctionSignature]:
        return list(self._functions.values())

    def extend(
        self,
        other: "PhysicalFunctionRegistry",
    ):
        for function in other.functions():
            self.define(function)


def create_electrical_function_registry(
    voltage_dimension: Dimension,
    current_dimension: Dimension,
    electrical_node: PortType,
) -> PhysicalFunctionRegistry:
    """
    Create the built-in electrical physical functions.
    """

    electrical_arguments = (
        FunctionArgument(
            kind=SymbolKind.PORT,
            port_type=electrical_node,
        ),
        FunctionArgument(
            kind=SymbolKind.PORT,
            port_type=electrical_node,
        ),
    )

    registry = PhysicalFunctionRegistry()

    registry.define(
        FunctionSignature(
            name="voltage",
            arguments=electrical_arguments,
            dimension=voltage_dimension,
        )
    )

    registry.define(
        FunctionSignature(
            name="current",
            arguments=electrical_arguments,
            dimension=current_dimension,
        )
    )

    return registry


def create_electrical_world_registry(
    quantities: dict,
    port_types: dict,
) -> PhysicalFunctionRegistry:
    """
    Create the electrical physical-function registry
    for a World.
    """

    electrical_node = port_types.get("ElectricalNode")
    voltage = quantities.get("Voltage")
    current = quantities.get("Current")

    if (
        electrical_node is None
        or voltage is None
        or current is None
    ):
        return PhysicalFunctionRegistry()

    return create_electrical_function_registry(
        voltage_dimension=voltage.dimension,
        current_dimension=current.dimension,
        electrical_node=electrical_node,
    )

def create_world_physical_function_registry(
    *,
    quantities: dict,
    port_types: dict,
    factories: tuple[PhysicalFunctionFactory, ...] = (),
) -> PhysicalFunctionRegistry:
    """
    Create the physical-function registry available to a World.

    Each physical domain contributes its own registry.
    """

    registry = PhysicalFunctionRegistry()

    for factory in factories:
        registry.extend(
            factory(
                quantities,
                port_types,
            )
        )

    return registry