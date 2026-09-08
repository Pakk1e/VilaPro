import unittest
from unittest.mock import patch

from worlds.simulation import (
    DynamicState,
    SimulationConfiguration,
    SimulationModel,
    SimulationResult,
    TransientAnalysis,
    TransientConfiguration,
    TransientConfigurationError,
    TransientStepContext,
)


class TransientConfigurationTest(unittest.TestCase):
    def test_default_grid(self):
        config = TransientConfiguration()
        self.assertEqual(config.time_points(), tuple(round(i * 0.01, 12) for i in range(101)))

    def test_grid_includes_stop(self):
        self.assertEqual(TransientConfiguration(start=0, stop=1, step=0.3).time_points()[-1], 1.0)

    def test_rejects_non_positive_step(self):
        with self.assertRaises(TransientConfigurationError):
            TransientConfiguration(step=0)

    def test_rejects_reverse_interval(self):
        with self.assertRaises(TransientConfigurationError):
            TransientConfiguration(start=1, stop=0, step=0.1)

    def test_rejects_excessive_grid(self):
        with self.assertRaises(TransientConfigurationError):
            TransientConfiguration(start=0, stop=100, step=0.001)


class RecordingStateHandler:
    def __init__(self):
        self.prepared = []
        self.accepted = []

    def prepare_step(self, model, previous_state, context):
        self.prepared.append((previous_state, context))
        return model

    def accept_step(self, state, result, context):
        state.set("C1", context.time)
        self.accepted.append((state.get("C1"), context))


class TransientStateExecutionTest(unittest.TestCase):
    def test_handler_receives_previous_state_and_commits_after_successful_solve(self):
        handler = RecordingStateHandler()
        configuration = SimulationConfiguration.from_dict({
            "analysis": "transient",
            "settings": {"start": 0, "stop": 0.2, "step": 0.1},
        })
        fake_result = SimulationResult(values={}, instances={})

        with patch("worlds.simulation.analysis._solve", return_value=fake_result):
            result = TransientAnalysis(state_handler=handler).run(
                SimulationModel(), configuration=configuration
            )

        self.assertEqual(len(result.results), 3)
        self.assertEqual([item.get("C1") for item in result.state_snapshots], [0.0, 0.1, 0.2])
        self.assertIsNone(handler.prepared[0][0].get("C1"))
        self.assertEqual(handler.prepared[1][0].get("C1"), 0.0)
        self.assertEqual(handler.prepared[2][0].get("C1"), 0.1)
        self.assertEqual([context.dt for _, context in handler.accepted], [None, 0.1, 0.1])

    def test_failed_step_does_not_commit_new_state(self):
        handler = RecordingStateHandler()
        configuration = SimulationConfiguration.from_dict({
            "analysis": "transient",
            "settings": {"start": 0, "stop": 0.2, "step": 0.1},
        })
        fake_result = SimulationResult(values={}, instances={})
        outcomes = [fake_result, RuntimeError("boom"), fake_result]

        def solve(*args, **kwargs):
            outcome = outcomes.pop(0)
            if isinstance(outcome, Exception):
                from worlds.simulation.solver import SolverError
                raise SolverError(str(outcome))
            return outcome

        with patch("worlds.simulation.analysis._solve", side_effect=solve):
            result = TransientAnalysis(state_handler=handler).run(
                SimulationModel(), configuration=configuration
            )

        self.assertEqual([item.get("C1") for item in result.state_snapshots], [0.0, 0.0, 0.2])
        self.assertEqual(len(handler.accepted), 2)
        self.assertEqual(handler.prepared[2][0].get("C1"), 0.0)

    def test_step_context_exposes_time_and_delta(self):
        first = TransientStepContext(time=0.0, previous_time=None, dt=None)
        second = TransientStepContext(time=0.25, previous_time=0.0, dt=0.25)
        self.assertIsNone(first.dt)
        self.assertEqual(second.dt, 0.25)
        self.assertEqual(second.previous_time, 0.0)


class DynamicStateTest(unittest.TestCase):
    def test_snapshot_is_immutable(self):
        state = DynamicState()
        state.set("C1", 1.0)
        snapshot = state.snapshot()
        state.set("C1", 2.0)
        self.assertEqual(snapshot.get("C1"), 1.0)


if __name__ == "__main__":
    unittest.main()
