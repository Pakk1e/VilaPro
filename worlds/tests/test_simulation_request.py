import unittest

from worlds.simulation import (
    DC_OPERATING_POINT,
    DC_SWEEP,
    SimulationRequest,
    SimulationRequestError,
)


class SimulationRequestTest(unittest.TestCase):
    def test_request_parses_with_default_analysis(self):
        request = SimulationRequest.from_dict(
            {
                "world_source": "world Electronics {}",
                "instances": [],
            }
        )

        self.assertEqual(request.world_source, "world Electronics {}")
        self.assertEqual(request.instances, ())
        self.assertEqual(request.simulation.analysis, DC_OPERATING_POINT)

    def test_request_round_trips(self):
        payload = {
            "world_source": "world Electronics {}",
            "instances": [{"id": "R1", "type": "Resistor"}],
            "simulation": {
                "mode": "static",
                "analysis": DC_OPERATING_POINT,
                "settings": {"temperature": 25},
                "outputs": ["node_voltages"],
            },
        }

        request = SimulationRequest.from_dict(payload)

        self.assertEqual(request.to_dict(), payload)

    def test_request_rejects_missing_world_source(self):
        with self.assertRaises(SimulationRequestError):
            SimulationRequest.from_dict({"instances": []})

    def test_request_rejects_non_object_instance(self):
        with self.assertRaises(SimulationRequestError):
            SimulationRequest.from_dict(
                {
                    "world_source": "world Electronics {}",
                    "instances": ["R1"],
                }
            )

    def test_request_rejects_invalid_simulation_configuration(self):
        with self.assertRaises(SimulationRequestError) as context:
            SimulationRequest.from_dict(
                {
                    "world_source": "world Electronics {}",
                    "instances": [],
                    "simulation": {"analysis": "unknown_analysis"},
                }
            )

        self.assertIn("Unsupported simulation analysis", str(context.exception))

    def test_request_accepts_dc_sweep(self):
        request = SimulationRequest.from_dict(
            {
                "world_source": "world Electronics {}",
                "instances": [],
                "simulation": {
                    "analysis": DC_SWEEP,
                    "settings": {
                        "source": "V1-id",
                        "start": 0,
                        "stop": 10,
                        "step": 1,
                    },
                },
            }
        )

        self.assertEqual(request.simulation.analysis, DC_SWEEP)


if __name__ == "__main__":
    unittest.main()
