from __future__ import annotations

from dataclasses import dataclass

from .dimensions import Dimension


@dataclass(frozen=True)
class Unit:
    """
    A physical unit.

    scale converts a value expressed in this unit
    into the corresponding SI base-unit value.
    """

    name: str
    symbol: str
    dimension: Dimension
    scale: float = 1.0

    def __mul__(self, other: Unit) -> Unit:
        return Unit(
            name=f"{self.name}*{other.name}",
            symbol=f"{self.symbol}·{other.symbol}",
            dimension=self.dimension * other.dimension,
            scale=self.scale * other.scale,
        )

    def __truediv__(self, other: Unit) -> Unit:
        return Unit(
            name=f"{self.name}/{other.name}",
            symbol=f"{self.symbol}/{other.symbol}",
            dimension=self.dimension / other.dimension,
            scale=self.scale / other.scale,
        )

    def __pow__(self, exponent: int) -> Unit:
        return Unit(
            name=f"{self.name}^{exponent}",
            symbol=f"{self.symbol}^{exponent}",
            dimension=self.dimension ** exponent,
            scale=self.scale ** exponent,
        )


@dataclass(frozen=True)
class Quantity:
    value: float
    unit: Unit

    @property
    def dimension(self) -> Dimension:
        return self.unit.dimension

    def to_si(self) -> float:
        return self.value * self.unit.scale

    def convert_to(self, target: Unit) -> Quantity:
        if self.dimension != target.dimension:
            raise ValueError(
                f"Cannot convert {self.unit.symbol} "
                f"to {target.symbol}: incompatible dimensions"
            )

        si_value = self.to_si()

        return Quantity(
            value=si_value / target.scale,
            unit=target,
        )

    def __add__(self, other: Quantity) -> Quantity:
        if self.dimension != other.dimension:
            raise ValueError(
                f"Cannot add {self.unit.symbol} "
                f"and {other.unit.symbol}: incompatible dimensions"
            )

        other_converted = other.convert_to(self.unit)

        return Quantity(
            value=self.value + other_converted.value,
            unit=self.unit,
        )

    def __sub__(self, other: Quantity) -> Quantity:
        if self.dimension != other.dimension:
            raise ValueError(
                f"Cannot subtract {self.unit.symbol} "
                f"and {other.unit.symbol}: incompatible dimensions"
            )

        other_converted = other.convert_to(self.unit)

        return Quantity(
            value=self.value - other_converted.value,
            unit=self.unit,
        )

    def __mul__(self, other: Quantity) -> Quantity:
        return Quantity(
            value=self.value * other.value,
            unit=self.unit * other.unit,
        )

    def __truediv__(self, other: Quantity) -> Quantity:
        return Quantity(
            value=self.value / other.value,
            unit=self.unit / other.unit,
        )
