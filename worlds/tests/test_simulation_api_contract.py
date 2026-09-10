import unittest

from worlds.simulation import SimulationDataset, SimulationResultModel
from worlds.simulation.api_contract import response_to_api_payload
from worlds.simulation.service import SimulationResponse


class SimulationAPIContractTest(unittest.TestCase):
    def _response(self):
        result = SimulationResultModel(
            datasets=(
                SimulationDataset("time", [0.0, 1.0], ("time",)),
                SimulationDataset("node_voltages", [{"out": 0.0}, {"out": 5.0}], ("time", "node")),
            ),
            analysis_information={"analysis": "transient"},
        )
        return SimulationResponse("transient", "completed", {"out": 5.0}, {}, [], result)

    def _operating_point_response(self):
        result = SimulationResultModel(
            datasets=(
                SimulationDataset("node_voltages", {"out": 5.0}),
                SimulationDataset("branch_currents", {"in": 0.12}),
                SimulationDataset("components", [{"id": "resistor-1", "name": "Resistor 1", "voltage": 5.0, "current": 0.12, "power": 0.6}]),
            ),
            analysis_information={"analysis": "dc_operating_point"},
        )
        return SimulationResponse(
            "dc_operating_point",
            "completed",
            {"out": 5.0},
            {"in": 0.12},
            [{"id": "resistor-1", "name": "Resistor 1", "voltage": 5.0, "current": 0.12, "power": 0.6}],
            result,
        )

    def test_contract_contains_visualization(self):
        payload = response_to_api_payload(self._response())
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["analysis"], "transient")
        self.assertIn("visualization", payload)
        self.assertEqual(payload["visualization"]["x_label"], "Time")

    def test_operating_point_contract_does_not_require_an_independent_variable(self):
        payload = response_to_api_payload(self._operating_point_response())
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["analysis"], "dc_operating_point")
        self.assertIsNone(payload["visualization"])
        self.assertEqual(payload["node_voltages"], {"out": 5.0})
        self.assertEqual(payload["branch_currents"], {"in": 0.12})

    def test_contract_keeps_legacy_fields(self):
        payload = response_to_api_payload(self._response())
        self.assertEqual(payload["node_voltages"], {"out": 5.0})
        self.assertEqual(payload["branch_currents"], {})
        self.assertEqual(payload["components"], [])

    def test_contract_returns_independent_collections(self):
        response = self._response()
        payload = response_to_api_payload(response)
        payload["node_voltages"]["out"] = 99.0
        self.assertEqual(response.node_voltages["out"], 5.0)


if __name__ == "__main__":
    unittest.main()
