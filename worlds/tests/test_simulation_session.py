import unittest

from worlds.simulation import (
    SimulationSession,
    SimulationSessionError,
    SimulationSessionStatus,
)


class SimulationSessionTest(unittest.TestCase):
    def test_session_starts_and_records_points(self):
        session = SimulationSession(max_points=2)

        self.assertEqual(session.status, SimulationSessionStatus.CREATED)
        self.assertEqual(session.time, 0.0)
        self.assertEqual(session.point_count, 0)

        session.start()
        session.record_point({"value": 1}, time=0.25)

        self.assertEqual(session.status, SimulationSessionStatus.RUNNING)
        self.assertEqual(session.time, 0.25)
        self.assertEqual(session.point_count, 1)
        self.assertEqual(session.results, [{"value": 1}])

    def test_session_enforces_point_limit(self):
        session = SimulationSession(max_points=1)
        session.start()
        session.record_point("first")

        with self.assertRaises(SimulationSessionError):
            session.record_point("second")

        self.assertEqual(session.point_count, 1)

    def test_session_can_complete(self):
        session = SimulationSession()
        session.start()
        session.complete()

        self.assertEqual(session.status, SimulationSessionStatus.COMPLETED)
        self.assertTrue(session.is_terminal)

        with self.assertRaises(SimulationSessionError):
            session.record_point("late")

    def test_session_can_fail_with_error(self):
        session = SimulationSession()
        session.start()
        session.fail("solver did not converge")

        self.assertEqual(session.status, SimulationSessionStatus.FAILED)
        self.assertEqual(session.error, "solver did not converge")
        self.assertTrue(session.is_terminal)

    def test_session_supports_cancellation_request(self):
        session = SimulationSession()
        session.start()
        session.request_cancel()

        self.assertTrue(session.cancel_requested)
        with self.assertRaises(SimulationSessionError):
            session.record_point("late")

        session.cancel()
        self.assertEqual(session.status, SimulationSessionStatus.CANCELLED)
        self.assertTrue(session.is_terminal)

    def test_invalid_lifecycle_transitions_are_rejected(self):
        session = SimulationSession()

        with self.assertRaises(SimulationSessionError):
            session.complete()

        session.start()
        with self.assertRaises(SimulationSessionError):
            session.start()

    def test_invalid_max_points_are_rejected(self):
        with self.assertRaises(SimulationSessionError):
            SimulationSession(max_points=0)

        with self.assertRaises(SimulationSessionError):
            SimulationSession(max_points=True)

    def test_snapshot_is_immutable_and_excludes_accumulated_results(self):
        session = SimulationSession(max_points=4, total_points=4)
        session.start()
        session.record_point({"value": 1}, time=0.5)

        snapshot = session.snapshot()

        self.assertEqual(snapshot.session_id, session.session_id)
        self.assertEqual(snapshot.status, SimulationSessionStatus.RUNNING)
        self.assertEqual(snapshot.time, 0.5)
        self.assertEqual(snapshot.point_count, 1)
        self.assertEqual(snapshot.total_points, 4)
        self.assertAlmostEqual(snapshot.progress, 0.25)
        self.assertFalse(hasattr(snapshot, "results"))

        with self.assertRaises(AttributeError):
            snapshot.point_count = 2

    def test_snapshot_progress_is_none_when_total_is_unknown(self):
        session = SimulationSession()
        session.start()
        session.record_point("first")

        self.assertIsNone(session.progress)
        self.assertIsNone(session.snapshot().progress)

    def test_total_points_are_enforced_and_complete_requires_all_points(self):
        session = SimulationSession(max_points=3, total_points=2)
        session.start()

        session.record_point("first")
        with self.assertRaises(SimulationSessionError):
            session.complete()

        session.record_point("second")
        self.assertEqual(session.progress, 1.0)
        session.complete()
        self.assertEqual(session.status, SimulationSessionStatus.COMPLETED)

    def test_result_points_returns_an_immutable_collection(self):
        session = SimulationSession()
        session.start()
        session.record_point({"value": 1})

        points = session.result_points()
        self.assertEqual(points, ({"value": 1},))
        self.assertIsInstance(points, tuple)
        self.assertIsNot(points, session.results)


if __name__ == "__main__":
    unittest.main()
