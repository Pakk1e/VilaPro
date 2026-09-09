import unittest

from worlds.simulation.dynamic import (
    CapacitorStateHandler,
    CapacitorTransientModel,
    DynamicComponentError,
    InductorStateHandler,
    InductorTransientModel,
)
from worlds.simulation.model import SimulationComponent, SimulationModel
from worlds.simulation.state import DynamicState, DynamicStateSnapshot, TransientStepContext


class DynamicPhysicsTest(unittest.TestCase):
    """Validate electrical transient representations and state propagation."""

    def test_capacitor_model_exposes_transient_metadata(self):
        model = CapacitorTransientModel(capacitance=1e-3)
        self.assertEqual(model.component_type, "Capacitor")
        self.assertEqual(model.layer, "electrical")
        self.assertEqual(model.analysis, "transient")
        self.assertEqual(model.method, "backward_euler")
        self.assertEqual(model.capacitance_value(), 1e-3)

    def test_inductor_model_exposes_transient_metadata(self):
        model = InductorTransientModel(inductance=1e-2)
        self.assertEqual(model.component_type, "Inductor")
        self.assertEqual(model.layer, "electrical")
        self.assertEqual(model.analysis, "transient")
        self.assertEqual(model.method, "backward_euler")
        self.assertEqual(model.inductance_value(), 1e-2)

    def test_capacitor_companion_terms_match_backward_euler(self):
        model = CapacitorTransientModel(capacitance=1e-3)
        conductance, history = model.companion_terms(
            self._component("C1", "Capacitor", {"C": 1e-3}), 2.0, 0.1
        )
        self.assertAlmostEqual(conductance, 0.01)
        self.assertAlmostEqual(history, -0.02)

    def test_inductor_companion_terms_match_backward_euler(self):
        model = InductorTransientModel(inductance=1e-2)
        conductance, history = model.companion_terms(
            self._component("L1", "Inductor", {"L": 1e-2}), 0.5, 0.1
        )
        self.assertAlmostEqual(conductance, 10.0)
        self.assertAlmostEqual(history, 0.5)

    def test_capacitor_rejects_invalid_capacitance(self):
        model = CapacitorTransientModel(capacitance=1e-3)
        with self.assertRaises(DynamicComponentError):
            model.capacitance(self._component("C1", "Capacitor", {"C": 0.0}))

    def test_inductor_rejects_invalid_inductance(self):
        model = InductorTransientModel(inductance=1e-2)
        with self.assertRaises(DynamicComponentError):
            model.inductance(self._component("L1", "Inductor", {"L": -1.0}))

    def test_capacitor_state_is_used_to_prepare_next_step(self):
        component = self._component("C1", "Capacitor", {"C": 1e-3, "initial_voltage": 0.25})
        model = SimulationModel(components=[component], nodes={"node_p", "node_n", "ground"})
        prepared = CapacitorStateHandler().prepare_step(
            model,
            DynamicStateSnapshot({"c1": 0.75}),
            TransientStepContext(0.1, 0.0, 0.1),
        )
        self.assertIn("0.75", repr(prepared.components[0].equations[0]))

    def test_inductor_state_is_used_to_prepare_next_step(self):
        component = self._component("L1", "Inductor", {"L": 1e-2, "initial_current": 0.25})
        model = SimulationModel(components=[component], nodes={"node_p", "node_n", "ground"})
        prepared = InductorStateHandler().prepare_step(
            model,
            DynamicStateSnapshot({"l1": 0.75}),
            TransientStepContext(0.1, 0.0, 0.1),
        )
        self.assertIn("0.75", repr(prepared.components[0].equations[0]))

    def test_capacitor_accept_step_commits_solved_voltage(self):
        component = self._component("C1", "Capacitor", {"C": 1e-3})
        state = DynamicState()
        CapacitorStateHandler().accept_step(
            state, _FakeResult(component, voltage=1.25), TransientStepContext(0.1, 0.0, 0.1)
        )
        self.assertEqual(state.get("c1"), 1.25)

    def test_inductor_accept_step_commits_solved_current(self):
        component = self._component("L1", "Inductor", {"L": 1e-2})
        state = DynamicState()
        InductorStateHandler().accept_step(
            state, _FakeResult(component, current=2.5), TransientStepContext(0.1, 0.0, 0.1)
        )
        self.assertEqual(state.get("l1"), 2.5)

    @staticmethod
    def _component(name, component_type, parameters):
        return SimulationComponent(
            name=name, display_name=name, component_id=name.lower(),
            component_type=component_type, parameters=parameters,
            ports={"p": "node_p", "n": "node_n"}, equations=[],
        )


class _FakeInstance:
    def __init__(self, voltage=None, current=None):
        self._voltage = voltage
        self._current = current

    def voltage(self):
        return self._voltage

    def current(self):
        return self._current


class _FakeResult:
    def __init__(self, component, voltage=None, current=None):
        self.instances = {component.name: component}
        self._instance = _FakeInstance(voltage, current)

    def instance(self, name):
        return self._instance


if __name__ == "__main__":
    unittest.main()
