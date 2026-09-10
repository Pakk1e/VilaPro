import unittest

from worlds.simulation.analysis import SimulationConfiguration
from worlds.simulation.live_service import LiveSimulationManager, LiveSimulationServiceError
from worlds.simulation.mode import SimulationMode


class LiveSimulationManagerTest(unittest.TestCase):
    def setUp(self):
        self.manager = LiveSimulationManager()
        self.configuration = SimulationConfiguration.from_dict({
            "mode": "live",
            "analysis": "dc_operating_point",
        })

    def test_create_returns_live_session(self):
        snapshot = self.manager.create(self.configuration)
        self.assertEqual(snapshot.mode, SimulationMode.LIVE)
        self.assertEqual(snapshot.analysis, "dc_operating_point")
        self.assertEqual(snapshot.status, "created")
        self.assertTrue(snapshot.session_id)

    def test_session_lifecycle(self):
        created = self.manager.create(self.configuration)
        running = self.manager.start(created.session_id)
        self.assertEqual(running.status, "running")

        updated = self.manager.update(
            created.session_id,
            independent_value=1.5,
            signals={"V(out)": 1.5},
        )
        self.assertEqual(updated.independent_value, 1.5)
        self.assertEqual(updated.signals["V(out)"], 1.5)

        completed = self.manager.complete(created.session_id)
        self.assertEqual(completed.status, "completed")

    def test_missing_session_is_rejected(self):
        with self.assertRaises(LiveSimulationServiceError):
            self.manager.get("missing")

    def test_static_configuration_cannot_create_live_session(self):
        configuration = SimulationConfiguration.from_dict({"mode": "static"})
        with self.assertRaises(LiveSimulationServiceError):
            self.manager.create(configuration)


if __name__ == "__main__":
    unittest.main()
