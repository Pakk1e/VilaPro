import unittest

from worlds.simulation import (
    LiveSimulationApplicationError,
    LiveSimulationApplicationService,
    LiveSimulationManager,
    LiveSimulationSnapshot,
    SimulationMode,
)
from worlds.simulation.api_contract import live_snapshot_to_api_payload


class LiveSimulationApplicationTest(unittest.TestCase):
    def test_start_requires_live_mode_before_building_model(self):
        service = LiveSimulationApplicationService(LiveSimulationManager())

        with self.assertRaisesRegex(
            LiveSimulationApplicationError,
            "simulation.mode='live'",
        ):
            service.start("not a valid world", [])

    def test_snapshot_api_payload_is_json_ready(self):
        snapshot = LiveSimulationSnapshot(
            session_id="session-1",
            analysis="dc_operating_point",
            mode=SimulationMode.LIVE,
            status="running",
            independent_value=None,
            signals={"V_node_1": 10.0, "current(VoltageSource_1)": -0.1},
            error=None,
        )

        self.assertEqual(
            live_snapshot_to_api_payload(snapshot),
            {
                "ok": True,
                "session_id": "session-1",
                "analysis": "dc_operating_point",
                "mode": "live",
                "status": "running",
                "independent_value": None,
                "signals": {
                    "V_node_1": 10.0,
                    "current(VoltageSource_1)": -0.1,
                },
                "error": None,
            },
        )


if __name__ == "__main__":
    unittest.main()
