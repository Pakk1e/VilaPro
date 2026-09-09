import unittest

from worlds.simulation import SimulationDataset, SimulationResultModel
from worlds.simulation.plot_presets import current_plot, voltage_plot


class SimulationPlotPresetsTest(unittest.TestCase):
    def _result(self):
        return SimulationResultModel(
            datasets=(
                SimulationDataset("time", [0.0, 1.0], ("time",)),
                SimulationDataset("node_voltages", [{"out": 0.0}, {"out": 5.0}], ("time", "node")),
                SimulationDataset("branch_currents", [{"R1": 0.0}, {"R1": 0.01}], ("time", "branch")),
            ),
            analysis_information={"analysis": "transient"},
        )

    def test_voltage_preset_selects_voltage_series(self):
        plot = voltage_plot(self._result())
        self.assertEqual(plot.series_ids, ("node_voltages:out",))
        self.assertEqual(plot.title, "Voltage response")

    def test_current_preset_selects_current_series(self):
        plot = current_plot(self._result())
        self.assertEqual(plot.series_ids, ("branch_currents:R1",))
        self.assertEqual(plot.title, "Current response")

    def test_custom_titles_and_ids_are_supported(self):
        plot = voltage_plot(self._result(), plot_id="v1", title="Output voltage")
        self.assertEqual(plot.id, "v1")
        self.assertEqual(plot.title, "Output voltage")


if __name__ == "__main__":
    unittest.main()
