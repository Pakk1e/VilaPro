import unittest

from worlds.simulation import SimulationDataset, SimulationResultModel, SimulationSeries


class SimulationResultModelTest(unittest.TestCase):
    def test_result_round_trips_generic_structure(self):
        result = SimulationResultModel(
            metadata={"status": "completed", "run_id": "run-1"},
            datasets=(
                SimulationDataset(
                    name="sweep",
                    values={"x": [0.0, 1.0], "y": [0.0, 2.0]},
                    dimensions=("x",),
                ),
            ),
            statistics={"iterations": 4},
            analysis_information={
                "analysis": "future_analysis",
                "settings": {"temperature": 25},
            },
        )

        self.assertEqual(
            result.to_dict(),
            {
                "metadata": {"status": "completed", "run_id": "run-1"},
                "datasets": [
                    {
                        "name": "sweep",
                        "values": {"x": [0.0, 1.0], "y": [0.0, 2.0]},
                        "dimensions": ["x"],
                    }
                ],
                "statistics": {"iterations": 4},
                "analysis_information": {
                    "analysis": "future_analysis",
                    "settings": {"temperature": 25},
                },
                "circuit_context": {},
            },
        )

    def test_circuit_context_round_trips(self):
        context = {
            "nodes": [
                {
                    "id": "node_1",
                    "label": "Node 1",
                    "is_ground": False,
                    "connections": [
                        {
                            "instance_id": "V1-id",
                            "instance_name": "Supply",
                            "component_type": "VoltageSource",
                            "port_id": "p",
                            "port_label": "p",
                        }
                    ],
                },
                {"id": "ground", "label": "Ground", "is_ground": True, "connections": []},
            ],
            "components": [
                {
                    "id": "V1-id",
                    "name": "Supply",
                    "type": "VoltageSource",
                    "ports": {"p": {"node": "node_1", "label": "p"}, "n": {"node": "ground", "label": "n"}},
                }
            ],
            "branches": [
                {
                    "id": "V1-id",
                    "name": "Supply",
                    "type": "VoltageSource",
                    "positive": {"port_id": "p", "node": "node_1"},
                    "negative": {"port_id": "n", "node": "ground"},
                }
            ],
        }
        result = SimulationResultModel(circuit_context=context)
        self.assertEqual(result.to_dict()["circuit_context"], context)

    def test_dataset_names_and_lookup(self):
        result = SimulationResultModel(
            datasets=(SimulationDataset("time", [0.0, 1.0]), SimulationDataset("node_voltages", [{"out": 0.0}, {"out": 0.5}])),
        )
        self.assertEqual(result.dataset_names, ("time", "node_voltages"))
        self.assertEqual(result.dataset("time").values, [0.0, 1.0])
        with self.assertRaises(KeyError):
            result.dataset("missing")

    def test_series_preserves_time_alignment_and_missing_points(self):
        result = SimulationResultModel(
            datasets=(SimulationDataset("node_voltages", [{"out": 0.0}, None, {"out": 1.0}], ("time", "node")),),
        )
        self.assertEqual(result.series("node_voltages", "out"), (0.0, None, 1.0))

    def test_series_rejects_non_row_dataset(self):
        result = SimulationResultModel(datasets=(SimulationDataset("time", [0.0, 1.0], ("time",)),))
        with self.assertRaises(ValueError):
            result.series("time", "out")


class SimulationSeriesTest(unittest.TestCase):
    def test_series_round_trips_to_dict(self):
        series = SimulationSeries.from_values(
            id="v-out",
            label="V(out)",
            x=[0.0, 1.0],
            y=[0.0, 5.0],
            quantity="voltage",
            unit="V",
            source="node:out",
        )
        self.assertEqual(series.to_dict(), {
            "id": "v-out", "label": "V(out)", "x": [0.0, 1.0], "y": [0.0, 5.0],
            "quantity": "voltage", "unit": "V", "source": "node:out",
        })

    def test_series_is_immutable_and_accepts_missing_values(self):
        series = SimulationSeries.from_values(
            id="i-r1", label="I(R1)", x=[0.0, 1.0, 2.0], y=[0.0, None, 0.01],
            quantity="current", unit="A", source="component:R1",
        )
        self.assertEqual(series.y, (0.0, None, 0.01))
        with self.assertRaises((AttributeError, TypeError)):
            series.label = "changed"

    def test_series_rejects_mismatched_axis_lengths(self):
        with self.assertRaises(ValueError):
            SimulationSeries.from_values(
                id="bad", label="bad", x=[0.0], y=[0.0, 1.0], quantity="voltage", unit="V", source="node:out"
            )

    def test_series_requires_identity_metadata(self):
        with self.assertRaises(ValueError):
            SimulationSeries.from_values(
                id="", label="V(out)", x=[], y=[], quantity="voltage", unit="V", source="node:out"
            )


if __name__ == "__main__":
    unittest.main()
