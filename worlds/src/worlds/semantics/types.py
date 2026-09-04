from __future__ import annotations

from dataclasses import dataclass
from enum import Enum, auto

from worlds.units import Dimension, Unit


@dataclass(frozen=True)
class PortType:
    name: str


class SymbolKind(Enum):
    QUANTITY = auto()
    UNIT = auto()
    COMPONENT = auto()
    PARAMETER = auto()
    PORT = auto()
    FUNCTION = auto()
    TYPE = auto()


@dataclass(frozen=True)
class Symbol:
    name: str
    kind: SymbolKind
    dimension: Dimension | None = None
    unit: Unit | None = None
    port_type: PortType | None = None


class TypeEnvironment:
    """
    Symbol table used by semantic analysis.

    The environment maps names in a World to their physical meaning.
    """

    def __init__(self):
        self._symbols: dict[str, Symbol] = {}

    def define(self, symbol: Symbol):
        if symbol.name in self._symbols:
            raise ValueError(
                f"Symbol already defined: {symbol.name}"
            )

        self._symbols[symbol.name] = symbol

    def lookup(self, name: str) -> Symbol | None:
        return self._symbols.get(name)

    def require(self, name: str) -> Symbol:
        symbol = self.lookup(name)

        if symbol is None:
            raise KeyError(
                f"Unknown symbol: {name}"
            )

        return symbol

    def symbols(self) -> list[Symbol]:
        return list(self._symbols.values())
