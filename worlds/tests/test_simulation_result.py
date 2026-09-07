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
            },
        )


if __name__ == "__main__":
    unittest.main()
