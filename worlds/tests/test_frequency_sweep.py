import unittest

from worlds.simulation import FREQUENCY_SWEEP, SimulationConfiguration, SimulationService


def load_world_source():
    with open("examples/electronics.vdl") as file:
        return file.read()


def rlc_instances():
    return [
        {
            "id": "V1-id",
            "name": "Input",
            "type": "VoltageSource",
            "parameters": {"V": 1.0},
            "ports": {"p": "node_in", "n": "ground"},
        },
        {
            "id": "R1-id",
            "name": "Resistor",
            "type": "Resistor",
            "parameters": {"R": 10.0},
            "ports": {"p": "node_in", "n": "node_l"},
        },
        {
            "id": "L1-id",
            "name": "Inductor",
            "type": "Inductor",
            "parameters": {"L": 0.001},
            "ports": {"p": "node_l", "n": "node_out"},
        },
        {
            "id": "C1-id",
            "name": "Capacitor",
            "type": "Capacitor",
            "parameters": {"C": 0.000001},
            "ports": {"p": "node_out", "n": "ground"},
        },
    ]


class FrequencySweepTest(unittest.TestCase):
    def test_configuration_accepts_frequency_sweep(self):
        config = SimulationConfiguration.from_dict({
            "analysis": FREQUENCY_SWEEP,
            "settings": {"start": 100.0, "stop": 10000.0, "step": 100.0, "amplitude": 1.0, "phase": 0.0},
        })
        self.assertEqual(config.analysis, FREQUENCY_SWEEP)
        self.assertEqual(config.settings["start"], 100.0)

    def test_frequency_sweep_returns_frequency_axis_and_component_response(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=rlc_instances(),
            simulation={
                "analysis": FREQUENCY_SWEEP,
                "settings": {"start": 100.0, "stop": 10000.0, "step": 100.0, "amplitude": 1.0, "phase": 0.0},
            },
        )

        self.assertEqual(response.analysis, FREQUENCY_SWEEP)
        self.assertEqual(response.status, "completed")
        payload = response.result.to_dict()
        datasets = {dataset["name"]: dataset for dataset in payload["datasets"]}
        self.assertEqual(datasets["frequency"]["values"][0], 100.0)
        self.assertEqual(datasets["frequency"]["values"][-1], 10000.0)
        self.assertEqual(len(datasets["frequency"]["values"]), 100)
        self.assertEqual(payload["statistics"]["point_count"], 100)
        self.assertEqual(payload["statistics"]["failed_point_count"], 0)
        self.assertEqual(payload["analysis_information"]["sweep"], {"variable": "frequency", "unit": "Hz"})
        component_rows = datasets["components"]["values"]
        self.assertEqual(len(component_rows), 100)
        self.assertTrue(any(row and any(item["id"] == "C1-id" for item in row) for row in component_rows))

    def test_frequency_sweep_rejects_non_positive_frequency(self):
        with self.assertRaises(Exception):
            SimulationConfiguration.from_dict({
                "analysis": FREQUENCY_SWEEP,
                "settings": {"start": 0, "stop": 1000, "step": 100},
            })


if __name__ == "__main__":
    unittest.main()
