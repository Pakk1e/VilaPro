import unittest

from worlds.simulation import SimulationDataset, SimulationResultModel


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
                {
                    "id": "ground",
                    "label": "Ground",
                    "is_ground": True,
                    "connections": [],
                },
            ],
            "components": [
                {
                    "id": "V1-id",
                    "name": "Supply",
                    "type": "VoltageSource",
                    "ports": {
                        "p": {"node": "node_1", "label": "p"},
                        "n": {"node": "ground", "label": "n"},
                    },
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


if __name__ == "__main__":
    unittest.main()
