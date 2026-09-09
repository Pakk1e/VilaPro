from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .series import SimulationSeries
from .plot_config import SimulationPlotConfig


class SimulationPlotError(ValueError):
    """Raised when a simulation plot definition is invalid."""


@dataclass(frozen=True)
class SimulationPlot:
    """A backend-independent plot definition over simulation series."""
    id: str
    title: str
    series: tuple[SimulationSeries, ...]
    x_label: str = ""
    x_unit: str = ""
    config: SimulationPlotConfig = SimulationPlotConfig()

    def __post_init__(self) -> None:
        if not self.id:
            raise SimulationPlotError("plot.id must not be empty")
        if not self.series:
            raise SimulationPlotError("plot.series must not be empty")
        ids = [item.id for item in self.series]
        if len(ids) != len(set(ids)):
            raise SimulationPlotError("plot.series ids must be unique")

    @classmethod
    def from_series(cls, *, id: str, title: str, series: Iterable[SimulationSeries], x_label: str = "", x_unit: str = "", config: SimulationPlotConfig | None = None) -> "SimulationPlot":
        return cls(id, title, tuple(series), x_label, x_unit, config or SimulationPlotConfig())

    def to_dict(self) -> dict[str, object]:
        return {"id": self.id, "title": self.title, "series": [item.to_dict() for item in self.series], "x_label": self.x_label, "x_unit": self.x_unit, "config": self.config.to_dict()}

    @property
    def series_ids(self) -> tuple[str, ...]:
        return tuple(item.id for item in self.series)
