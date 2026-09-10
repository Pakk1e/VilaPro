import unittest

from worlds.simulation.analysis import SimulationConfiguration
from worlds.simulation.live_runtime import LiveSimulationRuntime, LiveSimulationRuntimeError
from worlds.simulation.live_service import LiveSimulationManager
from worlds.simulation.mode import SimulationMode
from worlds.simulation.model import SimulationComponent, SimulationModel


class LiveSimulationRuntimeTest(unittest.TestCase):
    def setUp(self):
        self.manager = LiveSimulationManager()
        self.runtime = LiveSimulationRuntime(self.manager)
        self.model = SimulationModel()
        self.configuration = SimulationConfiguration.from_dict({
            "mode": "live",
            "analysis": "dc_operating_point",
        })

    def test_start_creates_running_session(self):
        snapshot = self.runtime.start(self.configuration)
        self.assertEqual(snapshot.mode, SimulationMode.LIVE)
        self.assertEqual(snapshot.status, "running")

    def test_live_runtime_rejects_non_dc_analysis(self):
        configuration = SimulationConfiguration.from_dict({
            "mode": "live",
            "analysis": "transient",
            "settings": {"start": 0, "stop": 1, "step": 0.1},
        })
        snapshot = self.runtime.start(configuration)
        with self.assertRaisesRegex(LiveSimulationRuntimeError, "currently supports"):
            self.runtime.step(snapshot.session_id, self.model, configuration=configuration)

    def test_static_configuration_is_rejected(self):
        configuration = SimulationConfiguration.from_dict({"mode": "static"})
        with self.assertRaisesRegex(LiveSimulationRuntimeError, "simulation.mode='live'"):
            self.runtime.start(configuration)


if __name__ == "__main__":
    unittest.main()
