from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping


class SimulationPlotConfigError(ValueError):
    """Raised when visualization configuration is invalid."""


@dataclass(frozen=True)
class SimulationSeriesStyle:
    """Presentation hints for one simulation series; no renderer dependency."""
    visible: bool = True
    axis: str = "y"
    label: str | None = None
    unit: str | None = None

    def __post_init__(self) -> None:
        if self.axis not in ("y", "y2"):
            raise SimulationPlotConfigError("series axis must be 'y' or 'y2'")

    def to_dict(self) -> dict[str, object]:
        return {"visible": self.visible, "axis": self.axis, "label": self.label, "unit": self.unit}


@dataclass(frozen=True)
class SimulationPlotConfig:
    """Renderer-neutral presentation configuration for a SimulationPlot."""
    styles: Mapping[str, SimulationSeriesStyle] = field(default_factory=dict)
    x_scale: str = "linear"
    y_scale: str = "linear"
    grid: bool = True
    legend: bool = True

    def __post_init__(self) -> None:
        if self.x_scale not in ("linear", "log"):
            raise SimulationPlotConfigError("x_scale must be 'linear' or 'log'")
        if self.y_scale not in ("linear", "log"):
            raise SimulationPlotConfigError("y_scale must be 'linear' or 'log'")

    def style_for(self, series_id: str) -> SimulationSeriesStyle:
        return self.styles.get(series_id, SimulationSeriesStyle())

    def to_dict(self) -> dict[str, object]:
        return {
            "styles": {key: value.to_dict() for key, value in self.styles.items()},
            "x_scale": self.x_scale,
            "y_scale": self.y_scale,
            "grid": self.grid,
            "legend": self.legend,
        }
