import unittest

from worlds.simulation.session import SimulationSession, SimulationSessionError, SimulationSessionStatus


class SimulationSessionRegressionTest(unittest.TestCase):
    def test_operating_point_can_record_exactly_one_point(self):
        session = SimulationSession("op", total_points=1)
        session.start()
        session.record_point({"ok": True})
        session.complete()
        self.assertEqual(session.status, SimulationSessionStatus.COMPLETED)
        self.assertEqual(len(session.result_points), 1)

    def test_session_rejects_second_record_when_total_is_one(self):
        session = SimulationSession("op", total_points=1)
        session.start()
        session.record_point({"ok": True})
        with self.assertRaises(SimulationSessionError):
            session.record_point({"ok": True})


if __name__ == "__main__":
    unittest.main()
