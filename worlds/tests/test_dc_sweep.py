import unittest

from worlds.simulation import (
    DC_SWEEP,
    DCSweepAnalysis,
    SimulationAnalysisError,
    SimulationConfiguration,
    SimulationResultModel,
    SimulationService,
    SimulationServiceError,
)


def load_world_source():
    with open("examples/electronics.vdl") as file:
        return file.read()


def voltage_divider_instances():
    return [
        {
            "id": "V1-id",
            "name": "Supply",
            "type": "VoltageSource",
            "parameters": {"V": 10.0},
            "ports": {"p": "node_1", "n": "ground"},
        },
        {
            "id": "R1-id",
            "name": "Load",
            "type": "Resistor",
            "parameters": {"R": 100.0},
            "ports": {"p": "node_1", "n": "ground"},
        },
    ]


def current_source_instances():
    return [
        {
            "id": "I1-id",
            "name": "Current Source",
            "type": "CurrentSource",
            "parameters": {"I": 0.1},
            "ports": {"p": "ground", "n": "node_1"},
        },
        {
            "id": "R1-id",
            "name": "Load",
            "type": "Resistor",
            "parameters": {"R": 100.0},
            "ports": {"p": "node_1", "n": "ground"},
        },
    ]


class DCSweepTest(unittest.TestCase):
    def test_configuration_accepts_dc_sweep(self):
        config = SimulationConfiguration.from_dict(
            {
                "analysis": DC_SWEEP,
                "settings": {
                    "source": "V1-id",
                    "start": 0,
                    "stop": 10,
                    "step": 2,
                },
            }
        )

        self.assertEqual(config.analysis, DC_SWEEP)
        self.assertEqual(config.settings["source"], "V1-id")

    def test_service_runs_voltage_source_sweep(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=voltage_divider_instances(),
            simulation={
                "analysis": DC_SWEEP,
                "settings": {
                    "source": "V1-id",
                    "start": 0,
                    "stop": 10,
                    "step": 2,
                },
            },
        )

        self.assertEqual(response.analysis, DC_SWEEP)
        self.assertEqual(response.status, "completed")
        self.assertAlmostEqual(response.node_voltages["node_1"], 10.0, places=12)
        self.assertAlmostEqual(response.components[1]["current"], 0.1, places=12)

        payload = response.result.to_dict()
        datasets = {dataset["name"]: dataset for dataset in payload["datasets"]}
        self.assertEqual(datasets["sweep"]["values"], [0.0, 2.0, 4.0, 6.0, 8.0, 10.0])
        self.assertEqual(datasets["node_voltages"]["values"][0]["node_1"], 0.0)
        self.assertEqual(datasets["node_voltages"]["values"][-1]["node_1"], 10.0)
        self.assertEqual(payload["statistics"]["point_count"], 6)
        self.assertEqual(payload["analysis_information"]["sweep"], {
            "source": "V1-id",
            "parameter": "V",
        })

    def test_service_runs_current_source_sweep(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=current_source_instances(),
            simulation={
                "analysis": DC_SWEEP,
                "settings": {
                    "source": "I1-id",
                    "parameter": "I",
                    "start": 0.0,
                    "stop": 0.1,
                    "step": 0.05,
                },
            },
        )

        payload = response.result.to_dict()
        datasets = {dataset["name"]: dataset for dataset in payload["datasets"]}
        self.assertEqual(datasets["sweep"]["values"], [0.0, 0.05, 0.1])
        self.assertAlmostEqual(datasets["node_voltages"]["values"][0]["node_1"], 0.0, places=12)
        self.assertAlmostEqual(datasets["node_voltages"]["values"][1]["node_1"], 5.0, places=12)
        self.assertAlmostEqual(datasets["node_voltages"]["values"][2]["node_1"], 10.0, places=12)
        self.assertEqual(payload["analysis_information"]["sweep"], {
            "source": "I1-id",
            "parameter": "I",
        })

    def test_service_runs_component_parameter_sweep(self):
        response = SimulationService().simulate(
            load_world_source(),
            instances=voltage_divider_instances(),
            simulation={
                "analysis": DC_SWEEP,
                "settings": {
                    "source": "R1-id",
                    "parameter": "R",
                    "start": 50,
                    "stop": 150,
                    "step": 50,
                },
            },
        )

        payload = response.result.to_dict()
        datasets = {dataset["name"]: dataset for dataset in payload["datasets"]}
        self.assertEqual(datasets["sweep"]["values"], [50.0, 100.0, 150.0])
        currents = [point["node_1->ground"] for point in datasets["branch_currents"]["values"]]
        self.assertAlmostEqual(currents[0], -0.2, places=12)
        self.assertAlmostEqual(currents[1], -0.1, places=12)
        self.assertAlmostEqual(currents[2], -10.0 / 150.0, places=12)
        self.assertEqual(payload["analysis_information"]["sweep"]["parameter"], "R")

    def test_sweep_does_not_mutate_original_component_value(self):
        instances = voltage_divider_instances()
        SimulationService().simulate(
            load_world_source(),
            instances=instances,
            simulation={
                "analysis": DC_SWEEP,
                "settings": {
                    "source": "V1-id",
                    "start": 0,
                    "stop": 10,
                    "step": 5,
                },
            },
        )

        self.assertEqual(instances[0]["parameters"]["V"], 10.0)

    def test_sweep_rejects_missing_source(self):
        with self.assertRaises(SimulationAnalysisError):
            SimulationConfiguration.from_dict({
                "analysis": DC_SWEEP,
                "settings": {"start": 0, "stop": 10, "step": 1},
            })

    def test_sweep_rejects_unknown_parameter(self):
        with self.assertRaises(SimulationServiceError):
            SimulationService().simulate(
                load_world_source(),
                instances=voltage_divider_instances(),
                simulation={
                    "analysis": DC_SWEEP,
                    "settings": {
                        "source": "R1-id",
                        "parameter": "X",
                        "start": 0,
                        "stop": 10,
                        "step": 1,
                    },
                },
            )

    def test_sweep_rejects_wrong_step_direction(self):
        with self.assertRaises(SimulationServiceError):
            SimulationService().simulate(
                load_world_source(),
                instances=voltage_divider_instances(),
                simulation={
                    "analysis": DC_SWEEP,
                    "settings": {
                        "source": "V1-id",
                        "start": 0,
                        "stop": 10,
                        "step": -1,
                    },
                },
            )

    def test_sweep_rejects_zero_step(self):
        with self.assertRaises(SimulationServiceError):
            SimulationService().simulate(
                load_world_source(),
                instances=voltage_divider_instances(),
                simulation={
                    "analysis": DC_SWEEP,
                    "settings": {
                        "source": "V1-id",
                        "start": 0,
                        "stop": 10,
                        "step": 0,
                    },
                },
            )

    def test_sweep_analysis_is_registered(self):
        self.assertEqual(DCSweepAnalysis.key, DC_SWEEP)
        self.assertIsInstance(
            SimulationResultModel.from_dc_sweep(
                status="completed",
                settings={},
                outputs=(),
                sweep_source="V1-id",
                sweep_parameter="V",
                points=[0.0],
                node_voltages=[{"ground": 0.0}],
                branch_currents=[{}],
                components=[[]],
            ),
            SimulationResultModel,
        )


if __name__ == "__main__":
    unittest.main()
