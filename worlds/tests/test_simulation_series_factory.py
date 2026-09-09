import unittest

from worlds.simulation import (
    SimulationDataset,
    SimulationResultModel,
    SimulationSeriesFactory,
    SimulationSeriesError,
    result_to_series,
)


class SimulationSeriesFactoryTest(unittest.TestCase):
    def test_transient_result_becomes_voltage_and_current_series(self):
        result = SimulationResultModel(
            datasets=(
                SimulationDataset("time", [0.0, 0.1, 0.2], ("time",)),
                SimulationDataset("node_voltages", [{"out": 0.0}, {"out": 2.5}, None], ("time", "node")),
                SimulationDataset("branch_currents", [{"R1": 0.0}, {"R1": 0.002}, None], ("time", "branch")),
            ),
            analysis_information={"analysis": "transient"},
        )
        series = SimulationSeriesFactory().from_result(result)
        self.assertEqual([item.id for item in series], ["node_voltages:out", "branch_currents:R1"])
        self.assertEqual(series[0].label, "V(out)")
        self.assertEqual(series[0].x, (0.0, 0.1, 0.2))
        self.assertEqual(series[0].y, (0.0, 2.5, None))
        self.assertEqual(series[0].quantity, "voltage")
        self.assertEqual(series[0].unit, "V")
        self.assertEqual(series[0].source, "node:out")
        self.assertEqual(series[1].label, "I(R1)")

    def test_dc_sweep_uses_sweep_as_independent_axis(self):
        result = SimulationResultModel(
            datasets=(
                SimulationDataset("sweep", [1.0, 2.0]),
                SimulationDataset("node_voltages", [{"out": 1.0}, {"out": 2.0}], ("sweep", "node")),
            ),
            analysis_information={"analysis": "dc_sweep"},
        )
        series = result_to_series(result)
        self.assertEqual(series[0].x, (1.0, 2.0))
        self.assertEqual(series[0].y, (1.0, 2.0))

    def test_series_keys_are_deterministic(self):
        result = SimulationResultModel(
            datasets=(
                SimulationDataset("time", [0.0]),
                SimulationDataset("node_voltages", [{"z": 1.0, "a": 2.0}]),
            ),
            analysis_information={"analysis": "transient"},
        )
        self.assertEqual([s.id for s in result_to_series(result)], ["node_voltages:a", "node_voltages:z"])

    def test_misaligned_dataset_is_rejected(self):
        result = SimulationResultModel(
            datasets=(SimulationDataset("time", [0.0, 1.0]), SimulationDataset("node_voltages", [{"out": 1.0}])),
            analysis_information={"analysis": "transient"},
        )
        with self.assertRaises(SimulationSeriesError):
            result_to_series(result)

    def test_unsupported_datasets_are_ignored(self):
        result = SimulationResultModel(
            datasets=(SimulationDataset("time", [0.0]), SimulationDataset("components", [{"R1": {}}])),
            analysis_information={"analysis": "transient"},
        )
        self.assertEqual(result_to_series(result), ())


if __name__ == "__main__":
    unittest.main()
