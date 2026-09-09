from __future__ import annotations

from dataclasses import dataclass


class ComponentRepresentationError(ValueError):
    """Raised when a layer-specific component representation is invalid."""


@dataclass(frozen=True)
class ComponentRepresentation:
    """Layer-specific description of how a component participates in an analysis.

    A representation is deliberately separate from the component entity. The
    same component can therefore expose different representations at different
    Worlds layers without changing its identity or instance parameters.
    """

    component_type: str
    layer: str = "generic"

    def __post_init__(self) -> None:
        if not self.layer:
            raise ComponentRepresentationError("representation layer must not be empty")
        if not self.component_type:
            raise ComponentRepresentationError("representation component_type must not be empty")


@dataclass(frozen=True)
class ElectricalComponentRepresentation(ComponentRepresentation):
    """Base contract for circuit-level electrical component representations."""

    layer: str = "electrical"


__all__ = [
    "ComponentRepresentation",
    "ComponentRepresentationError",
    "ElectricalComponentRepresentation",
]
