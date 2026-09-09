from __future__ import annotations

from typing import Any, Mapping

from .plot import SimulationPlot


class SimulationVisualizationError(ValueError):
    """Raised when a visualization payload cannot be produced."""


def plot_to_visualization(plot: SimulationPlot) -> dict[str, Any]:
    """Return a deterministic JSON-compatible representation of a plot."""
    if not isinstance(plot, SimulationPlot):
        raise SimulationVisualizationError("plot must be a SimulationPlot")
    payload = plot.to_dict()
    _assert_json_compatible(payload)
    return payload


def plots_to_visualization(plots: tuple[SimulationPlot, ...] | list[SimulationPlot]) -> dict[str, Any]:
    """Return a deterministic collection payload suitable for a frontend API."""
    if any(not isinstance(plot, SimulationPlot) for plot in plots):
        raise SimulationVisualizationError("plots must contain only SimulationPlot instances")
    return {"plots": [plot_to_visualization(plot) for plot in plots]}


def _assert_json_compatible(value: object) -> None:
    if value is None or isinstance(value, (str, int, float, bool)):
        return
    if isinstance(value, (list, tuple)):
        for item in value:
            _assert_json_compatible(item)
        return
    if isinstance(value, Mapping):
        for key, item in value.items():
            if not isinstance(key, str):
                raise SimulationVisualizationError("visualization payload mapping keys must be strings")
            _assert_json_compatible(item)
        return
    raise SimulationVisualizationError(f"unsupported visualization value type: {type(value).__name__}")
