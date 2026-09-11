import time
import unittest

from worlds.simulation import (
    LiveSimulationApplicationError,
    LiveSimulationApplicationService,
    LiveSimulationManager,
    LiveSimulationSnapshot,
    SimulationMode,
)
from worlds.simulation.api_contract import live_snapshot_to_api_payload
from worlds.simulation.live_application import _LiveContext
from worlds.simulation.analysis import SimulationConfiguration
from worlds.simulation.model import SimulationModel


class _FakeRuntime:
    def __init__(self, manager):
        self.manager = manager
        self.steps = 0
        self.sample_times = []

    def step(self, session_id, model, *, known=None, configuration=None, sample_time=0.0):
        self.steps += 1
        self.sample_times.append(sample_time)
        return self.manager.update(session_id, independent_value=sample_time, signals={"V(out)": float(self.steps)})

    def cancel(self, session_id):
        return self.manager.cancel(session_id)

    def complete(self, session_id):
        return self.manager.complete(session_id)


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

    def test_background_worker_updates_until_session_is_cancelled(self):
        manager = LiveSimulationManager()
        runtime = _FakeRuntime(manager)
        service = LiveSimulationApplicationService(manager, runtime=runtime)
        configuration = SimulationConfiguration.from_dict({"mode": "live", "analysis": "dc_operating_point"})
        created = manager.create(configuration)
        manager.start(created.session_id)
        service._contexts[created.session_id] = _LiveContext(configuration, SimulationModel(), {})
        service._sample_times[created.session_id] = 0.0

        service._start_worker(created.session_id)
        deadline = time.monotonic() + 2.0
        while runtime.steps < 2 and time.monotonic() < deadline:
            time.sleep(0.02)

        self.assertGreaterEqual(runtime.steps, 2)
        self.assertEqual(manager.get(created.session_id).status, "running")
        self.assertIn("V(out)", manager.get(created.session_id).signals)
        self.assertEqual(runtime.sample_times[0], 0.0)
        self.assertGreater(runtime.sample_times[1], runtime.sample_times[0])

        manager.cancel(created.session_id)
        service._stop_worker(created.session_id)
        time.sleep(0.05)
        self.assertEqual(manager.get(created.session_id).status, "cancelled")


if __name__ == "__main__":
    unittest.main()
