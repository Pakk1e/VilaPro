from __future__ import annotations

from worlds.units import (
    AMPERE,
    CANDELA,
    COULOMB,
    FARAD,
    JOULE,
    KELVIN,
    KILOGRAM,
    METER,
    MOLE,
    NEWTON,
    OHM,
    SECOND,
    VOLT,
    WATT,
    Unit,
    prefixed_unit,
)


class UnitError(Exception):
    pass


class UnitEnvironment:
    """
    Resolves VDL unit names and symbols to Unit objects.

    The actual Unit definitions live in worlds.units.
    """

    def __init__(self):
        self._units: dict[str, Unit] = {}

        self._register_builtin_units()

    def define(self, name: str, unit: Unit):
        if name in self._units:
            raise UnitError(
                f"Unit already defined: {name}"
            )

        self._units[name] = unit

    def lookup(self, name: str) -> Unit | None:
        return self._units.get(name)

    def require(self, name: str) -> Unit:
        unit = self.lookup(name)

        if unit is None:
            raise UnitError(
                f"Unknown unit: {name}"
            )

        return unit

    def _register_builtin_units(self):
        units = [
            METER,
            KILOGRAM,
            SECOND,
            AMPERE,
            KELVIN,
            MOLE,
            CANDELA,
            NEWTON,
            JOULE,
            WATT,
            VOLT,
            OHM,
            FARAD,
            COULOMB,
        ]

        for unit in units:
            self.define(unit.symbol, unit)

        # Common textual aliases.
        self.define("meter", METER)
        self.define("metre", METER)

        self.define("kilogram", KILOGRAM)
        self.define("second", SECOND)
        self.define("ampere", AMPERE)
        self.define("kelvin", KELVIN)
        self.define("mole", MOLE)
        self.define("candela", CANDELA)

        self.define("newton", NEWTON)
        self.define("joule", JOULE)
        self.define("watt", WATT)
        self.define("volt", VOLT)
        self.define("ohm", OHM)
        self.define("Ohm", OHM)
        self.define("farad", FARAD)
        self.define("coulomb", COULOMB)

        # OHM is already registered through its symbol "Ω".

        # Common prefixed units.
        self.define("mV", prefixed_unit("m", VOLT))
        self.define("kV", prefixed_unit("k", VOLT))

        self.define("mA", prefixed_unit("m", AMPERE))
        self.define("kA", prefixed_unit("k", AMPERE))

        self.define("mΩ", prefixed_unit("m", OHM))
        self.define("kΩ", prefixed_unit("k", OHM))

        self.define("mOhm", prefixed_unit("m", OHM))
        self.define("kOhm", prefixed_unit("k", OHM))
