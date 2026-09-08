import unittest

from worlds.simulation import (
    DynamicState,
    DynamicStateError,
    DynamicStateSnapshot,
    TransientStepContext,
)


class DynamicStateTest(unittest.TestCase):
    def test_state_snapshot_is_immutable(self):
        state = DynamicState()
        state.set("C1", {"voltage": 1.5})
        snapshot = state.snapshot()
        state.set("C1", {"voltage": 2.0})
        self.assertEqual(snapshot.get("C1")["voltage"], 1.5)
        with self.assertRaises(TypeError):
            snapshot.values["C2"] = 1

    def test_state_copy_is_independent(self):
        state = DynamicState({"C1": 1.0})
        copied = state.copy()
        copied.set("C1", 2.0)
        self.assertEqual(state.get("C1"), 1.0)
        self.assertEqual(copied.get("C1"), 2.0)

    def test_empty_component_id_is_rejected(self):
        with self.assertRaises(DynamicStateError):
            DynamicState().set("", 1.0)

    def test_initial_step_has_no_dt(self):
        context = TransientStepContext(time=0.0, previous_time=None, dt=None)
        self.assertIsNone(context.previous_time)
        self.assertIsNone(context.dt)

    def test_step_context_calculates_valid_interval(self):
        context = TransientStepContext(time=0.2, previous_time=0.1, dt=0.1)
        self.assertEqual(context.dt, 0.1)

    def test_step_context_rejects_mismatched_dt(self):
        with self.assertRaises(DynamicStateError):
            TransientStepContext(time=0.2, previous_time=0.1, dt=0.2)

    def test_step_context_rejects_non_forward_time(self):
        with self.assertRaises(DynamicStateError):
            TransientStepContext(time=0.1, previous_time=0.2, dt=0.1)


if __name__ == "__main__":
    unittest.main()
