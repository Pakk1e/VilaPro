from __future__ import annotations

from .plot import SimulationPlot
from .plot_factory import SimulationPlotFactory
from .result import SimulationResultModel
from .series_selection import filter_series_by_quantity


def _preset_plot(result: SimulationResultModel, *, quantity: str, plot_id: str, title: str | None) -> SimulationPlot:
    series = filter_series_by_quantity(result.to_series(), quantity)
    return SimulationPlotFactory().from_series(
        series,
        plot_id=plot_id,
        title=title,
    )


def voltage_plot(result: SimulationResultModel, *, plot_id: str = "voltage", title: str | None = None) -> SimulationPlot:
    """Create a plot containing all voltage series from a result."""
    return _preset_plot(result, quantity="voltage", plot_id=plot_id, title=title or "Voltage response")


def current_plot(result: SimulationResultModel, *, plot_id: str = "current", title: str | None = None) -> SimulationPlot:
    """Create a plot containing all current series from a result."""
    return _preset_plot(result, quantity="current", plot_id=plot_id, title=title or "Current response")
