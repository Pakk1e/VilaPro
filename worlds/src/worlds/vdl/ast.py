from __future__ import annotations

from dataclasses import dataclass, field

from worlds.math import Equation as MathEquation


@dataclass
class Parameter:
    name: str
    type_name: str


@dataclass
class Port:
    name: str
    type_name: str


@dataclass
class Representation:
    name: str
    equations: list[MathEquation] = field(default_factory=list)


@dataclass
class Component:
    name: str
    parameters: list[Parameter] = field(default_factory=list)
    ports: list[Port] = field(default_factory=list)
    representations: list[Representation] = field(default_factory=list)


@dataclass
class Quantity:
    name: str
    dimension: str | None = None
    unit: str | None = None


@dataclass
class Unit:
    name: str
    expression: str


@dataclass
class PortTypeDefinition:
    name: str


@dataclass
class World:
    name: str
    quantities: list[Quantity] = field(default_factory=list)
    units: list[Unit] = field(default_factory=list)
    port_types: list[PortTypeDefinition] = field(default_factory=list)
    components: list[Component] = field(default_factory=list)
