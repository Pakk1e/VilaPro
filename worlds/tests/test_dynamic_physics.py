import math
import unittest

from worlds.simulation import (
    CapacitorTransientModel,
    InductorTransientModel,
    SimulationComponent,
    SimulationModel,
    TransientAnalysis,
)


class DynamicPhysicsTest(unittest.TestCase):
    def _config(self, stop, step):
        return type("Config", (), {"settings": {"start": 0.0, "stop": stop, "step": step}})()

    def _component(self, name, component_type, parameters, p, n):
        return SimulationComponent(
            name=name,
            display_name=name,
            component_id=name.lower(),
            component_type=component_type,
            parameters=parameters,
            ports={"p": p, "n": n},
            equations=[],
        )

    def _rc_model(self):
        return SimulationModel(components=[
            self._component("V1", "VoltageSource", {"V": 1.0}, "in", "ground"),
            self._component("R1", "Resistor", {"R": 10.0}, "in", "out"),
            self._component("C1", "Capacitor", {"C": 1e-3, "initial_voltage": 0.0}, "out", "ground"),
        ], nodes={"in", "out", "ground"})

    def _rl_model(self):
        return SimulationModel(components=[
            self._component("V1", "VoltageSource", {"V": 1.0}, "in", "ground"),
            self._component("R1", "Resistor", {"R": 10.0}, "in", "out"),
            self._component("L1", "Inductor", {"L": 1e-2, "initial_current": 0.0}, "out", "ground"),
        ], nodes={"in", "out", "ground"})

    def test_capacitor_model_exposes_initial_voltage(self):
        model = CapacitorTransientModel(capacitance=1e-3, initial_voltage=0.25)
        self.assertEqual(model.initial_voltage, 0.25)
        self.assertEqual(model.analysis, "transient")

    def test_inductor_model_exposes_initial_current(self):
        model = InductorTransientModel(inductance=1e-2, initial_current=0.125)
        self.assertEqual(model.initial_current, 0.125)
        self.assertEqual(model.analysis, "transient")

    def test_rc_voltage_rises_toward_source(self):
        result = TransientAnalysis().run(self._rc_model(), configuration=self._config(0.1, 0.01))
        voltages = [snapshot.node_voltage("out") for snapshot in result.results if snapshot is not None]
        self.assertGreater(voltages[-1], voltages[0])
        self.assertLess(voltages[-1], 1.0)

    def test_rl_current_rises_toward_steady_state(self):
        result = TransientAnalysis().run(self._rl_model(), configuration=self._config(0.01, 0.001))
        currents = [snapshot.instance("L1").current() for snapshot in result.results if snapshot is not None]
        self.assertGreater(currents[-1], currents[0])
        self.assertLess(currents[-1], 0.1)

    def test_rc_smaller_step_is_consistent(self):
        coarse = TransientAnalysis().run(self._rc_model(), configuration=self._config(0.1, 0.01))
        fine = TransientAnalysis().run(self._rc_model(), configuration=self._config(0.1, 0.005))
        vc = coarse.results[-1].node_voltage("out")
        vf = fine.results[-1].node_voltage("out")
        self.assertTrue(math.isfinite(vc))
        self.assertTrue(math.isfinite(vf))
        self.assertLess(abs(vf - vc), 0.02)

    def test_nonzero_initial_conditions_are_preserved_at_start(self):
        capacitor = CapacitorTransientModel(capacitance=1e-3, initial_voltage=0.4)
        inductor = InductorTransientModel(inductance=1e-2, initial_current=0.03)
        self.assertEqual(capacitor.initial_voltage, 0.4)
        self.assertEqual(inductor.initial_current, 0.03)


if __name__ == "__main__":
    unittest.main()
