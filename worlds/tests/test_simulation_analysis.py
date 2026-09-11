import unittest

from worlds.simulation import (
    AC,
    DC_OPERATING_POINT,
    SimulationAnalysisError,
    SimulationConfiguration,
    SimulationResultModel,
    SimulationService,
    SimulationServiceError,
)


def load_world_source():
    with open("examples/electronics.vdl") as file:
        return file.read()


class SimulationAnalysisTest(unittest.TestCase):
    def test_default_configuration_is_dc_operating_point(self):
        config = SimulationConfiguration.from_dict(None)
        self.assertEqual(config.analysis, DC_OPERATING_POINT)
        self.assertEqual(config.settings, {})
        self.assertEqual(config.outputs, ())

    def test_configuration_round_trips(self):
        config = SimulationConfiguration.from_dict({
            "analysis": DC_OPERATING_POINT,
            "settings": {"reference": "ground"},
            "outputs": ["node_voltages"],
        })
        self.assertEqual(config.to_dict(), {
            "mode": "static",
            "analysis": DC_OPERATING_POINT,
            "settings": {"reference": "ground"},
            "outputs": ["node_voltages"],
        })

    def test_configuration_rejects_unknown_analysis(self):
        with self.assertRaises(SimulationAnalysisError) as context:
            SimulationConfiguration.from_dict({"analysis": "unsupported_analysis"})
        self.assertIn("Unsupported simulation analysis", str(context.exception))
        self.assertIn(DC_OPERATING_POINT, str(context.exception))

    def test_configuration_rejects_invalid_settings(self):
        with self.assertRaises(SimulationAnalysisError):
            SimulationConfiguration.from_dict({"analysis": DC_OPERATING_POINT, "settings": []})

    def test_configuration_rejects_invalid_outputs(self):
        with self.assertRaises(SimulationAnalysisError):
            SimulationConfiguration.from_dict({
                "analysis": DC_OPERATING_POINT,
                "outputs": ["node_voltages", 123],
            })

    def test_service_dispatches_dc_operating_point(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=[
                {"id": "V1-id", "name": "Supply", "type": "VoltageSource", "parameters": {"V": 10.0}, "ports": {"p": "node_1", "n": "ground"}},
                {"id": "R1-id", "name": "Load", "type": "Resistor", "parameters": {"R": 100.0}, "ports": {"p": "node_1", "n": "ground"}},
            ],
            simulation={"analysis": DC_OPERATING_POINT, "settings": {}, "outputs": []},
        )
        self.assertEqual(response.analysis, DC_OPERATING_POINT)
        self.assertEqual(response.status, "completed")
        self.assertEqual({item["id"] for item in response.components}, {"V1-id", "R1-id"})
        self.assertAlmostEqual(response.node_voltages["node_1"], 10.0, places=12)

    def test_dc_operating_point_handles_capacitor_as_open_circuit(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=[
                {"id": "V1-id", "name": "Supply", "type": "VoltageSource", "parameters": {"V": 12.0}, "ports": {"p": "node_1", "n": "ground"}},
                {"id": "C1-id", "name": "Capacitor", "type": "Capacitor", "parameters": {"C": 1e-6}, "ports": {"p": "node_1", "n": "ground"}},
                {"id": "R1-id", "name": "Load", "type": "Resistor", "parameters": {"R": 100.0}, "ports": {"p": "node_1", "n": "ground"}},
            ],
            simulation={"analysis": DC_OPERATING_POINT},
        )
        self.assertEqual(response.status, "completed")
        self.assertAlmostEqual(response.node_voltages["node_1"], 12.0, places=12)
        capacitor = next(item for item in response.components if item["id"] == "C1-id")
        self.assertAlmostEqual(capacitor["current"], 0.0, places=12)

    def test_component_parameter_sweep_changes_resistance(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=[
                {"id": "V1-id", "name": "Supply", "type": "VoltageSource", "parameters": {"V": 10.0}, "ports": {"p": "node_1", "n": "ground"}},
                {"id": "R1-id", "name": "Load", "type": "Resistor", "parameters": {"R": 100.0}, "ports": {"p": "node_1", "n": "ground"}},
            ],
            simulation={"analysis": "dc_sweep", "settings": {"source": "R1-id", "parameter": "R", "start": 100, "stop": 300, "step": 100}},
        )
        self.assertEqual(response.status, "completed")
        payload = response.result.to_dict()
        self.assertEqual(payload["datasets"][0]["values"], [100.0, 200.0, 300.0])
        components = payload["datasets"][4]["values"]
        currents = [row[1]["current"] for row in components]
        self.assertAlmostEqual(currents[0], 0.1, places=12)
        self.assertAlmostEqual(currents[1], 0.05, places=12)
        self.assertAlmostEqual(currents[2], 1 / 30, places=12)
        self.assertEqual(payload["analysis_information"]["sweep"]["parameter"], "R")

    def test_static_ac_returns_generic_result_envelope(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=[
                {"id": "V1-id", "name": "Supply", "type": "VoltageSource", "parameters": {"V": 1.0}, "ports": {"p": "node_1", "n": "ground"}},
                {"id": "R1-id", "name": "Load", "type": "Resistor", "parameters": {"R": 100.0}, "ports": {"p": "node_1", "n": "ground"}},
            ],
            simulation={"analysis": AC, "settings": {"frequency": 1000, "amplitude": 2, "phase": 30}},
        )
        self.assertEqual(response.analysis, AC)
        self.assertEqual(response.status, "completed")
        self.assertIsInstance(response.result, SimulationResultModel)
        payload = response.result.to_dict()
        self.assertEqual([item["name"] for item in payload["datasets"]], ["frequency", "phasors"])
        self.assertEqual(payload["datasets"][0]["values"], [1000.0])
        self.assertAlmostEqual(payload["analysis_information"]["excitation"]["magnitude"], 2.0, places=12)

    def test_service_result_uses_generic_envelope(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=[
                {"id": "V1-id", "name": "Supply", "type": "VoltageSource", "parameters": {"V": 10.0}, "ports": {"p": "node_1", "n": "ground"}},
                {"id": "R1-id", "name": "Load", "type": "Resistor", "parameters": {"R": 100.0}, "ports": {"p": "node_1", "n": "ground"}},
            ],
            simulation={"analysis": DC_OPERATING_POINT, "settings": {"temperature": 25}, "outputs": ["node_voltages"]},
        )
        self.assertIsInstance(response.result, SimulationResultModel)
        payload = response.result.to_dict()
        self.assertEqual(payload["metadata"]["status"], "completed")
        self.assertEqual(payload["analysis_information"], {
            "analysis": DC_OPERATING_POINT,
            "settings": {"temperature": 25},
            "outputs": ["node_voltages"],
        })
        datasets = {dataset["name"]: dataset for dataset in payload["datasets"]}
        self.assertEqual(datasets["node_voltages"]["values"]["node_1"], 10.0)
        self.assertEqual(datasets["node_voltages"]["dimensions"], [])
        self.assertEqual(payload["statistics"], {})

    def test_result_context_maps_nodes_to_instances_and_ports(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=[
                {"id": "V1-id", "name": "Supply", "type": "VoltageSource", "parameters": {"V": 10.0}, "ports": {"p": "node_1", "n": "ground"}},
                {"id": "R1-id", "name": "Load", "type": "Resistor", "parameters": {"R": 100.0}, "ports": {"p": "node_1", "n": "ground"}},
            ],
        )
        context = response.result.to_dict()["circuit_context"]
        node_1 = next(node for node in context["nodes"] if node["id"] == "node_1")
        self.assertEqual(node_1["label"], "Node 1")
        self.assertFalse(node_1["is_ground"])
        self.assertEqual({(item["instance_id"], item["port_id"]) for item in node_1["connections"]}, {("V1-id", "p"), ("R1-id", "p")})
        ground = next(node for node in context["nodes"] if node["id"] == "ground")
        self.assertTrue(ground["is_ground"])
        self.assertEqual(ground["label"], "Ground")
        self.assertEqual({(item["instance_id"], item["port_id"]) for item in ground["connections"]}, {("V1-id", "n"), ("R1-id", "n")})
        voltage_source = next(item for item in context["components"] if item["id"] == "V1-id")
        self.assertEqual(voltage_source["ports"]["p"]["node"], "node_1")
        self.assertEqual(voltage_source["ports"]["n"]["node"], "ground")
        branch = next(item for item in context["branches"] if item["id"] == "V1-id")
        self.assertEqual(branch["positive"]["node"], "node_1")
        self.assertEqual(branch["negative"]["node"], "ground")

    def test_service_rejects_unknown_analysis(self):
        with self.assertRaises(SimulationServiceError) as context:
            SimulationService().simulate(load_world_source(), instances=[], simulation={"analysis": "unsupported_analysis"})
        self.assertIn("Unsupported simulation analysis", str(context.exception))

    def test_service_keeps_legacy_default_behavior(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=[
                {"type": "VoltageSource", "parameters": {"V": 10.0}, "ports": {"p": "node_1", "n": "ground"}},
                {"type": "Resistor", "parameters": {"R": 100.0}, "ports": {"p": "node_1", "n": "ground"}},
            ],
        )
        self.assertEqual(response.analysis, DC_OPERATING_POINT)
        self.assertEqual(response.status, "completed")
        self.assertAlmostEqual(response.node_voltages["node_1"], 10.0, places=12)


if __name__ == "__main__":
    unittest.main()
