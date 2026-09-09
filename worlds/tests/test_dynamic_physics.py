import unittest

from worlds.simulation.dynamic import (
    CapacitorTransientModel,
    DynamicComponentError,
    InductorTransientModel,
)


class DynamicPhysicsTest(unittest.TestCase):
    """Validate the public electrical transient representation contracts.

    Behavioral RC/RL circuit tests belong with the transient integration tests
    once the component-equation construction contract is exposed at that
    level. These tests deliberately verify the dynamic models themselves.
    """

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
            self._component("C1", "Capacitor", {"C": 1e-3}),
            previous_voltage=2.0,
            dt=0.1,
        )
        self.assertAlmostEqual(conductance, 0.01)
        self.assertAlmostEqual(history, -0.02)

    def test_inductor_companion_terms_match_backward_euler(self):
        model = InductorTransientModel(inductance=1e-2)
        conductance, history = model.companion_terms(
            self._component("L1", "Inductor", {"L": 1e-2}),
            previous_current=0.5,
            dt=0.1,
        )
        self.assertAlmostEqual(conductance, 10.0)
        self.assertAlmostEqual(history, 0.5)

    def test_capacitor_rejects_invalid_capacitance(self):
        model = CapacitorTransientModel(capacitance=1e-3)
        component = self._component("C1", "Capacitor", {"C": 0.0})
        with self.assertRaises(DynamicComponentError):
            model.capacitance(component)

    def test_inductor_rejects_invalid_inductance(self):
        model = InductorTransientModel(inductance=1e-2)
        component = self._component("L1", "Inductor", {"L": -1.0})
        with self.assertRaises(DynamicComponentError):
            model.inductance(component)

    @staticmethod
    def _component(name, component_type, parameters):
        from worlds.simulation.model import SimulationComponent

        return SimulationComponent(
            name=name,
            display_name=name,
            component_id=name.lower(),
            component_type=component_type,
            parameters=parameters,
            ports={"p": "node_p", "n": "node_n"},
            equations=[],
        )


if __name__ == "__main__":
    unittest.main()
