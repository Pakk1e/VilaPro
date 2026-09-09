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

    def test_component_resistor_exposes_voltage_current_power(self):
        result = SimulationResultModel(
            datasets=(
                SimulationDataset("time", [0.0, 1.0, 2.0]),
                SimulationDataset("components", [
                    [{"id": "R1", "name": "R1", "type": "resistor", "voltage": 0.0, "current": 0.0, "power": 0.0}],
                    [{"id": "R1", "name": "R1", "type": "resistor", "voltage": 2.0, "current": 1.0, "power": 2.0}],
                    [{"id": "R1", "name": "R1", "type": "resistor", "voltage": 4.0, "current": 2.0, "power": 8.0}],
                ]),
            ),
            analysis_information={"analysis": "transient"},
        )
        series = result_to_series(result)
        self.assertEqual([(s.quantity, s.unit, s.label) for s in series], [("voltage", "V", "V(R1)"), ("current", "A", "I(R1)"), ("power", "W", "P(R1)")])
        self.assertEqual(series[0].x, (0.0, 1.0, 2.0))
        self.assertEqual(series[0].y, (0.0, 2.0, 4.0))
        self.assertEqual(series[1].y, (0.0, 1.0, 2.0))
        self.assertEqual(series[2].y, (0.0, 2.0, 8.0))

    def test_multiple_rlc_components_keep_stable_ids(self):
        result = SimulationResultModel(
            datasets=(
                SimulationDataset("time", [0.0, 1.0]),
                SimulationDataset("components", [
                    [{"id": "C1", "name": "C1", "type": "capacitor", "voltage": 0, "current": 0, "power": 0}, {"id": "L1", "name": "L1", "type": "inductor", "voltage": 0, "current": 0, "power": 0}],
                    [{"id": "C1", "name": "C1", "type": "capacitor", "voltage": 1, "current": 2, "power": 2}, {"id": "L1", "name": "L1", "type": "inductor", "voltage": 3, "current": 4, "power": 12}],
                ]),
            ),
            analysis_information={"analysis": "transient"},
        )
        series = result_to_series(result)
        self.assertEqual([s.id for s in series], ["components:C1:voltage", "components:C1:current", "components:C1:power", "components:L1:voltage", "components:L1:current", "components:L1:power"])
        self.assertEqual(series[3].y, (0.0, 3.0))

    def test_missing_component_sample_remains_aligned(self):
        result = SimulationResultModel(
            datasets=(SimulationDataset("time", [0.0, 1.0, 2.0]), SimulationDataset("components", [[{"id": "C1", "name": "C1", "type": "capacitor", "voltage": 0, "current": 0, "power": 0}], None, [{"id": "C1", "name": "C1", "type": "capacitor", "voltage": 2, "current": 1, "power": 2}]])),
            analysis_information={"analysis": "transient"},
        )
        voltage = next(s for s in result_to_series(result) if s.id == "components:C1:voltage")
        self.assertEqual(voltage.x, (0.0, 1.0, 2.0))
        self.assertEqual(voltage.y, (0.0, None, 2.0))

    def test_component_series_source_uses_stable_component_id(self):
        result = SimulationResultModel(
            datasets=(SimulationDataset("time", [0.0]), SimulationDataset("components", [[{"id": "L1", "name": "Coil", "type": "inductor", "voltage": 3, "current": 2, "power": 6}]])),
            analysis_information={"analysis": "transient"},
        )
        series = result_to_series(result)
        self.assertEqual(series[0].source, "component:L1")
        self.assertEqual(series[0].label, "V(Coil)")


if __name__ == "__main__":
    unittest.main()
