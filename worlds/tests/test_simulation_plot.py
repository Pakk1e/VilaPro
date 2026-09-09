import unittest

from worlds.simulation import SimulationPlot, SimulationPlotError, SimulationSeries


class SimulationPlotTest(unittest.TestCase):
    def _series(self, series_id: str, label: str) -> SimulationSeries:
        return SimulationSeries.from_values(
            id=series_id,
            label=label,
            x=[0.0, 1.0],
            y=[0.0, 1.0],
            quantity="voltage",
            unit="V",
            source=f"node:{series_id}",
        )

    def test_plot_round_trips(self):
        plot = SimulationPlot.from_series(
            id="plot-1",
            title="Transient response",
            series=[self._series("v-out", "V(out)")],
            x_label="Time",
            x_unit="s",
        )
        self.assertEqual(plot.to_dict()["id"], "plot-1")
        self.assertEqual(plot.to_dict()["series"][0]["label"], "V(out)")

    def test_plot_is_immutable(self):
        plot = SimulationPlot.from_series(id="plot", title="Plot", series=[self._series("v", "V")])
        with self.assertRaises(AttributeError):
            plot.title = "Changed"
        with self.assertRaises(TypeError):
            plot.series += (self._series("i", "I"),)

    def test_plot_rejects_empty_series(self):
        with self.assertRaises(SimulationPlotError):
            SimulationPlot.from_series(id="plot", title="Plot", series=[])

    def test_plot_rejects_duplicate_series_ids(self):
        series = self._series("same", "one")
        with self.assertRaises(SimulationPlotError):
            SimulationPlot.from_series(id="plot", title="Plot", series=[series, series])


if __name__ == "__main__":
    unittest.main()
