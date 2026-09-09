from __future__ import annotations

from .plot import SimulationPlot
from .result import SimulationResultModel
from .series_selection import filter_series_by_quantity


def voltage_plot(result: SimulationResultModel, *, plot_id: str = "voltage", title: str | None = None) -> SimulationPlot:
    """Create a plot containing all voltage series from a result."""
    series = filter_series_by_quantity(result.to_series(), "voltage")
    return SimulationPlot.from_series(
        id=plot_id,
        title=title or "Voltage response",
        series=series,
        x_label="Sweep" if result.analysis_information.get("analysis") == "dc_sweep" else "Time",
        x_unit="" if result.analysis_information.get("analysis") == "dc_sweep" else "s",
    )


def current_plot(result: SimulationResultModel, *, plot_id: str = "current", title: str | None = None) -> SimulationPlot:
    """Create a plot containing all current series from a result."""
    series = filter_series_by_quantity(result.to_series(), "current")
    return SimulationPlot.from_series(
        id=plot_id,
        title=title or "Current response",
        series=series,
        x_label="Sweep" if result.analysis_information.get("analysis") == "dc_sweep" else "Time",
        x_unit="" if result.analysis_information.get("analysis") == "dc_sweep" else "s",
    )
