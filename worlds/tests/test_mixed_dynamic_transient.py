import math
import unittest

from worlds.math import Binary, Equation, FunctionCall, Number, Variable
from worlds.simulation import SimulationComponent, SimulationModel, TransientAnalysis


class MixedDynamicTransientTest(unittest.TestCase):
    def _config(self, stop, step):
        return type("Config", (), {"settings": {"start": 0.0, "stop": stop, "step": step}})()

    def _rlc_model(self):
        source = SimulationComponent(
            name="V1", display_name="V1", component_id="v1", component_type="VoltageSource",
            parameters={"V": 1.0}, ports={"p": "in", "n": "ground"},
            equations=[Equation(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), right=Variable("V"))],
        )
        resistor = SimulationComponent(
            name="R1", display_name="R1", component_id="r1", component_type="Resistor",
            parameters={"R": 10.0}, ports={"p": "in", "n": "out"},
            equations=[Equation(
                left=FunctionCall("current", (Variable("p"), Variable("n"))),
                right=Binary(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), operator="/", right=Variable("R")),
            )],
        )
        capacitor = SimulationComponent(
            name="C1", display_name="C1", component_id="c1", component_type="Capacitor",
            parameters={"C": 1e-3, "initial_voltage": 0.0}, ports={"p": "out", "n": "ground"}, equations=[],
        )
        inductor = SimulationComponent(
            name="L1", display_name="L1", component_id="l1", component_type="Inductor",
            parameters={"L": 1e-2, "initial_current": 0.0}, ports={"p": "out", "n": "ground"}, equations=[],
        )
        return SimulationModel(components=[source, resistor, capacitor, inductor], nodes={"in", "out", "ground"})

    def test_rc_and_rl_states_can_coexist(self):
        result = TransientAnalysis().run(self._rlc_model(), configuration=self._config(0.002, 0.001))
        self.assertEqual(len(result.points), 3)
        self.assertTrue(all(item is not None for item in result.results))
        self.assertTrue(all(error is None for error in result.errors))

    def test_mixed_dynamic_response_is_finite(self):
        result = TransientAnalysis().run(self._rlc_model(), configuration=self._config(0.005, 0.0005))
        for snapshot in result.results:
            self.assertIsNotNone(snapshot)
            self.assertTrue(math.isfinite(snapshot.node_voltage("out")))
            self.assertTrue(math.isfinite(snapshot.instance("C1").voltage()))
            self.assertTrue(math.isfinite(snapshot.instance("L1").current()))

    def test_dynamic_states_are_independent(self):
        model = self._rlc_model()
        result = TransientAnalysis().run(model, configuration=self._config(0.002, 0.001))
        first = result.results[0]
        last = result.results[-1]
        self.assertIsNotNone(first)
        self.assertIsNotNone(last)
        self.assertNotEqual(first.instance("C1").voltage(), last.instance("C1").voltage())
        self.assertNotEqual(first.instance("L1").current(), last.instance("L1").current())


if __name__ == "__main__":
    unittest.main()
