import unittest

from worlds.simulation import (
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
        response = SimulationService().simulate(" + "" + " 
