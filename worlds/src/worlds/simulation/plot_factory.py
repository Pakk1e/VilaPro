from __future__ import annotations

from collections.abc import Sequence

from .plot import SimulationPlot, SimulationPlotError
from .result import SimulationResultModel
from .series import SimulationSeries
from .series_factory import SimulationSeriesFactory
from .series_selection import select_series


class SimulationPlotFactory:
    """Build backend-independent plot definitions from simulation results or series."""

    def __init__(self, series_factory: SimulationSeriesFactory | None = None) -> None:
        self._series_factory = series_factory or SimulationSeriesFactory()

    @staticmethod
    def _axis_for_result(result: SimulationResultModel) -> tuple[str, str]:
        analysis = str(result.analysis_information.get("analysis", "simulation"))
        if analysis == "frequency_sweep":
            return "Frequency", "Hz"
        return ("Sweep", "") if analysis == "dc_sweep" else ("Time", "s")

    def from_series(
        self,
        series: Sequence[SimulationSeries],
        *,
        plot_id: str = "simulation-plot",
        title: str = "Simulation result",
        x_label: str = "",
        x_unit: str = "",
    ) -> SimulationPlot:
        selected = tuple(series)
        if not selected:
            raise SimulationPlotError("plot requires at least one series")
        return SimulationPlot.from_series(
            id=plot_id,
            title=title,
            series=selected,
            x_label=x_label,
            x_unit=x_unit,
        )

    def from_result(
        self,
        result: SimulationResultModel,
        *,
        plot_id: str = "simulation-result",
        title: str | None = None,
        series_ids: Sequence[str] | None = None,
    ) -> SimulationPlot:
        series = select_series(self._series_factory.from_result(result), series_ids)
        if not series:
            raise SimulationPlotError("Simulation result contains no plottable series")
        x_label, x_unit = self._axis_for_result(result)
        analysis = str(result.analysis_information.get("analysis", "simulation"))
        if title is None:
            title = f"{analysis.replace('_', ' ').title()} result"
        return self.from_series(
            series,
            plot_id=plot_id,
            title=title,
            series=series,
            x_label=x_label,
            x_unit=x_unit,
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
