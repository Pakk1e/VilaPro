from __future__ import annotations

from collections.abc import Sequence

from .plot import SimulationPlot, SimulationPlotError
from .result import SimulationResultModel
from .series_factory import SimulationSeriesFactory


class SimulationPlotFactory:
    """Build backend-independent plot definitions from simulation results."""

    def __init__(self, series_factory: SimulationSeriesFactory | None = None) -> None:
        self._series_factory = series_factory or SimulationSeriesFactory()

    def from_result(
        self,
        result: SimulationResultModel,
        *,
        plot_id: str = "simulation-result",
        title: str | None = None,
        series_ids: Sequence[str] | None = None,
    ) -> SimulationPlot:
        series = self._series_factory.from_result(result)
        if series_ids is not None:
            requested = tuple(series_ids)
            available = {item.id: item for item in series}
            missing = [item for item in requested if item not in available]
            if missing:
                raise SimulationPlotError(f"Unknown simulation series: {', '.join(missing)}")
            series = tuple(available[item] for item in requested)

        if not series:
            raise SimulationPlotError("Simulation result contains no plottable series")

        analysis = str(result.analysis_information.get("analysis", "simulation"))
        if title is None:
            title = f"{analysis.replace('_', ' ').title()} result"
        axis_name = "Sweep" if analysis == "dc_sweep" else "Time"
        axis_unit = "" if analysis == "dc_sweep" else "s"
        return SimulationPlot.from_series(
            id=plot_id,
            title=title,
            series=series,
            x_label=axis_name,
            x_unit=axis_unit,
        )


def result_to_plot(
    result: SimulationResultModel,
    *,
    plot_id: str = "simulation-result",
    title: str | None = None,
    series_ids: Sequence[str] | None = None,
) -> SimulationPlot:
    return SimulationPlotFactory().from_result(
        result, plot_id=plot_id, title=title, series_ids=series_ids
    )
