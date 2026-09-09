from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


class SimulationSeriesError(ValueError):
    """Raised when a simulation series is invalid."""


@dataclass(frozen=True)
class SimulationSeries:
    """One plottable simulation quantity over an independent axis."""

    id: str
    label: str
    x: tuple[float, ...]
    y: tuple[float | None, ...]
    quantity: str
    unit: str
    source: str

    def __post_init__(self) -> None:
        if not self.id:
            raise SimulationSeriesError("series.id must not be empty")
        if not self.label:
            raise SimulationSeriesError("series.label must not be empty")
        if len(self.x) != len(self.y):
            raise SimulationSeriesError("series.x and series.y must have equal length")
        if not self.quantity:
            raise SimulationSeriesError("series.quantity must not be empty")
        if not self.unit:
            raise SimulationSeriesError("series.unit must not be empty")
        if not self.source:
            raise SimulationSeriesError("series.source must not be empty")

    @classmethod
    def from_values(cls, *, id: str, label: str, x: Sequence[float], y: Sequence[float | None], quantity: str, unit: str, source: str) -> "SimulationSeries":
        return cls(id, label, tuple(x), tuple(y), quantity, unit, source)

    @property
    def point_count(self) -> int:
        return len(self.x)

    @property
    def valid_point_count(self) -> int:
        return sum(value is not None for value in self.y)

    @property
    def has_missing_values(self) -> bool:
        return self.valid_point_count != self.point_count

    def to_dict(self) -> dict[str, object]:
        return {"id": self.id, "label": self.label, "x": list(self.x), "y": list(self.y), "quantity": self.quantity, "unit": self.unit, "source": self.source}
