from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Dimension:
    """
    Physical dimension represented using the seven SI base dimensions.

    Order:
        length, mass, time, current, temperature, amount, luminosity
    """

    length: int = 0
    mass: int = 0
    time: int = 0
    current: int = 0
    temperature: int = 0
    amount: int = 0
    luminosity: int = 0

    def __mul__(self, other: Dimension) -> Dimension:
        return Dimension(
            self.length + other.length,
            self.mass + other.mass,
            self.time + other.time,
            self.current + other.current,
            self.temperature + other.temperature,
            self.amount + other.amount,
            self.luminosity + other.luminosity,
        )

    def __truediv__(self, other: Dimension) -> Dimension:
        return Dimension(
            self.length - other.length,
            self.mass - other.mass,
            self.time - other.time,
            self.current - other.current,
            self.temperature - other.temperature,
            self.amount - other.amount,
            self.luminosity - other.luminosity,
        )

    def __pow__(self, exponent: int) -> Dimension:
        return Dimension(
            self.length * exponent,
            self.mass * exponent,
            self.time * exponent,
            self.current * exponent,
            self.temperature * exponent,
            self.amount * exponent,
            self.luminosity * exponent,
        )


DIMENSIONLESS = Dimension()

LENGTH = Dimension(length=1)
MASS = Dimension(mass=1)
TIME = Dimension(time=1)
CURRENT = Dimension(current=1)
TEMPERATURE = Dimension(temperature=1)
AMOUNT = Dimension(amount=1)
LUMINOSITY = Dimension(luminosity=1)
