import unittest

from worlds.simulation.mode import SimulationMode


class SimulationModeTest(unittest.TestCase):
    def test_supported_modes(self):
        self.assertEqual(SimulationMode.STATIC.value, "static")
        self.assertEqual(SimulationMode.LIVE.value, "live")

    def test_mode_is_string_compatible(self):
        self.assertEqual(SimulationMode.STATIC, "static")
        self.assertEqual(SimulationMode.LIVE, "live")
