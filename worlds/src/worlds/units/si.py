from .core import Unit
from .dimensions import (
    AMOUNT,
    CURRENT,
    LENGTH,
    LUMINOSITY,
    MASS,
    TEMPERATURE,
    TIME,
)


# SI base units

METER = Unit(
    name="meter",
    symbol="m",
    dimension=LENGTH,
)

KILOGRAM = Unit(
    name="kilogram",
    symbol="kg",
    dimension=MASS,
)

SECOND = Unit(
    name="second",
    symbol="s",
    dimension=TIME,
)

AMPERE = Unit(
    name="ampere",
    symbol="A",
    dimension=CURRENT,
)

KELVIN = Unit(
    name="kelvin",
    symbol="K",
    dimension=TEMPERATURE,
)

MOLE = Unit(
    name="mole",
    symbol="mol",
    dimension=AMOUNT,
)

CANDELA = Unit(
    name="candela",
    symbol="cd",
    dimension=LUMINOSITY,
)


# Common derived SI units

NEWTON = KILOGRAM * METER / (SECOND ** 2)
NEWTON = Unit(
    name="newton",
    symbol="N",
    dimension=NEWTON.dimension,
    scale=NEWTON.scale,
)

JOULE = NEWTON * METER
JOULE = Unit(
    name="joule",
    symbol="J",
    dimension=JOULE.dimension,
    scale=JOULE.scale,
)

WATT = JOULE / SECOND
WATT = Unit(
    name="watt",
    symbol="W",
    dimension=WATT.dimension,
    scale=WATT.scale,
)

VOLT = WATT / AMPERE
VOLT = Unit(
    name="volt",
    symbol="V",
    dimension=VOLT.dimension,
    scale=VOLT.scale,
)

OHM = VOLT / AMPERE
OHM = Unit(
    name="ohm",
    symbol="Ω",
    dimension=OHM.dimension,
    scale=OHM.scale,
)

FARAD = Unit(
    name="farad",
    symbol="F",
    dimension=AMPERE * SECOND / VOLT,
    scale=1.0,
)

COULOMB = AMPERE * SECOND
COULOMB = Unit(
    name="coulomb",
    symbol="C",
    dimension=COULOMB.dimension,
    scale=COULOMB.scale,
)
