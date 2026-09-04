from __future__ import annotations

from dataclasses import dataclass, field

from worlds.math import Equation


@dataclass
class SimulationComponent:
    """
    Runtime representation of one component instance.

    Semantic validation has already happened before this
    object is created.
    """

    name: str
    component_type: str
    parameters: dict[str, float] = field(default_factory=dict)
    ports: dict[str, str | None] = field(default_factory=dict)
    equations: list[Equation] = field(default_factory=list)


@dataclass
class SimulationModel:
    """
    Runtime model containing components and their connections.

    A node is identified by a string. Component ports point to
    these node names.
    """

    components: list[SimulationComponent] = field(
        default_factory=list
    )
    nodes: set[str] = field(
        default_factory=set
    )

    def add_component(
        self,
        component: SimulationComponent,
    ):
        self.components.append(component)
        self.nodes.update(component.ports.values())
