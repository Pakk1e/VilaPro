import json
import unittest

from worlds.simulation import SimulationDataset, SimulationResultModel, result_to_plot
from worlds.simulation.visualization import SimulationVisualizationError, plot_to_visualization, plots_to_visualization


class SimulationVisualizationTest(unittest.TestCase):
    def _plot(self):
        result = SimulationResultModel(
            datasets=(
                SimulationDataset("time", [0.0, 1.0], ("time",)),
                SimulationDataset("node_voltages", [{"out": 0.0}, {"out": 5.0}], ("time", "node")),
            ),
            analysis_information={"analysis": "transient"},
        )
        return result_to_plot(result)

    def test_plot_payload_is_json_serializable(self):
        payload = plot_to_visualization(self._plot())
        encoded = json.dumps(payload)
        self.assertIn("node_voltages:out", encoded)
        self.assertEqual(payload["x_label"], "Time")

    def test_collection_payload_is_stable(self):
        plot = self._plot()
        self.assertEqual(plots_to_visualization([plot]), {"plots": [plot.to_dict()]})

    def test_invalid_plot_is_rejected(self):
        with self.assertRaises(SimulationVisualizationError):
            plot_to_visualization(object())


if __name__ == "__main__":
    unittest.main()
