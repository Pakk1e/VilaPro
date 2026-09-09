import unittest

from worlds.simulation import SimulationDataset, SimulationPlotFactory, SimulationResultModel, SimulationSeriesFactory, result_to_plot


class SimulationPlotFactoryTest(unittest.TestCase):
    def _result(self):
        return SimulationResultModel(
            datasets=(
                SimulationDataset("time", [0.0, 1.0], ("time",)),
                SimulationDataset("node_voltages", [{"out": 0.0}, {"out": 5.0}], ("time", "node")),
                SimulationDataset("branch_currents", [{"R1": 0.0}, {"R1": 0.01}], ("time", "branch")),
            ),
            analysis_information={"analysis": "transient"},
        )

    def test_factory_builds_plot_from_result(self):
        plot = SimulationPlotFactory().from_result(self._result(), plot_id="p1")
        self.assertEqual(plot.id, "p1")
        self.assertEqual(plot.x_label, "Time")
        self.assertEqual(plot.x_unit, "s")
        self.assertEqual(plot.series_ids, ("node_voltages:out", "branch_currents:R1"))

    def test_factory_can_select_series(self):
        plot = result_to_plot(self._result(), series_ids=("node_voltages:out",))
        self.assertEqual(plot.series_ids, ("node_voltages:out",))

    def test_factory_rejects_unknown_series(self):
        with self.assertRaises(ValueError):
            SimulationPlotFactory().from_result(self._result(), series_ids=("node_voltages:missing",))

    def test_factory_rejects_result_without_plottable_series(self):
        result = SimulationResultModel(datasets=(SimulationDataset("time", [0.0, 1.0], ("time",)),), analysis_information={"analysis": "transient"})
        with self.assertRaises(ValueError):
            SimulationPlotFactory().from_result(result)


if __name__ == "__main__":
    unittest.main()
