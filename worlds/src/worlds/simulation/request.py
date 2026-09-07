from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .analysis import SimulationConfiguration


class SimulationRequestError(ValueError):
    """Raised when a simulation request is malformed."""


@dataclass(frozen=True)
class SimulationRequest:
    """Validated application request for one simulation run."""

    world_source: str
    instances: tuple[dict, ...]
    simulation: SimulationConfiguration

    @classmethod
    def from_dict(cls, value: Mapping[str, object]) -> "SimulationRequest":
        if not isinstance(value, Mapping):
            raise SimulationRequestError("Request body must be a JSON object")

        world_source = value.get("world_source")
        instances = value.get("instances")

        if not isinstance(world_source, str):
            raise SimulationRequestError("world_source must be a string")
        if not isinstance(instances, list):
            raise SimulationRequestError("instances must be a list")
        if not all(isinstance(instance, dict) for instance in instances):
            raise SimulationRequestError("each instance must be an object")

        try:
            simulation = SimulationConfiguration.from_dict(value.get("simulation"))
        except ValueError as exc:
            raise SimulationRequestError(str(exc)) from exc

        return cls(
            world_source=world_source,
            instances=tuple(dict(instance) for instance in instances),
            simulation=simulation,
        )

    def to_dict(self) -> dict[str, object]:
        return {
            "world_source": self.world_source,
            "instances": [dict(instance) for instance in self.instances],
            "simulation": self.simulation.to_dict(),
        }
