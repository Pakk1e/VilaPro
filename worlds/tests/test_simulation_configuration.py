import unittest

from worlds.simulation.analysis import (
    DC_OPERATING_POINT,
    SimulationAnalysisError,
    SimulationConfiguration,
)
from worlds.simulation.mode import SimulationMode


class SimulationConfigurationModeTest(unittest.TestCase):
    def test_mode_defaults_to_static(self):
        configuration = SimulationConfiguration.from_dict({"analysis": DC_OPERATING_POINT})
        self.assertEqual(configuration.mode, SimulationMode.STATIC)

    def test_explicit_static_mode(self):
        configuration = SimulationConfiguration.from_dict({"mode": "static"})
        self.assertEqual(configuration.mode, SimulationMode.STATIC)

    def test_live_mode_is_parsed(self):
        configuration = SimulationConfiguration.from_dict({"mode": "live"})
        self.assertEqual(configuration.mode, SimulationMode.LIVE)

    def test_invalid_mode_is_rejected(self):
        with self.assertRaisesRegex(SimulationAnalysisError, "Unsupported simulation mode"):
            SimulationConfiguration.from_dict({"mode": "realtime"})

    def test_mode_is_serialized(self):
        configuration = SimulationConfiguration.from_dict({"mode": "live", "analysis": DC_OPERATING_POINT})
        self.assertEqual(configuration.to_dict()["mode"], "live")


if __name__ == "__main__":
    unittest.main()
