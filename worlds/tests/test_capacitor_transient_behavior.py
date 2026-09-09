import math
import unittest

from worlds.math import Binary, Equation, FunctionCall, Variable
from worlds.simulation import (
    CapacitorStateHandler,
    DynamicState,
    SimulationComponent,
    SimulationModel,
    TransientAnalysis,
    TransientStepContext,
)


class CapacitorTransientBehaviorTest(unittest.TestCase):
    def _discharge_model(self, *, initial_voltage=10.0):
        resistor = SimulationComponent(
            name="R1", display_name="R1", component_id="r1", component_type="Resistor",
            parameters={"R": 1000.0}, ports={"p": "out", "n": "ground"},
            equations=[Equation(
                left=FunctionCall("current", (Variable("p"), Variable("n"))),
                right=Binary(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), operator="/", right=Variable("R")),
            )],
        )
        capacitor = SimulationComponent(
            name="C1", display_name="C1", component_id="c1", component_type="Capacitor",
            parameters={"C": 1e-6, "initial_voltage": initial_voltage},
            ports={"p": "out", "n": "ground"}, equations=[],
        )
        return SimulationModel(components=[resistor, capacitor], nodes={"out", "ground"})

    def _charge_model(self):
        source = SimulationComponent(
            name="V1", display_name="V1", component_id="v1", component_type="VoltageSource",
            parameters={"V": 10.0}, ports={"p": "in", "n": "ground"},
            equations=[Equation(
                left=FunctionCall("voltage", (Variable("p"), Variable("n"))), right=Variable("V")
            )],
        )
        resistor = SimulationComponent(
            name="R1", display_name="R1", component_id="r1", component_type="Resistor",
            parameters={"R": 1000.0}, ports={"p": "in", "n": "out"},
            equations=[Equation(
                left=FunctionCall("current", (Variable("p"), Variable("n"))),
                right=Binary(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), operator="/", right=Variable("R")),
            )],
        )
        capacitor = SimulationComponent(
            name="C1", display_name="C1", component_id="c1", component_type="Capacitor",
            parameters={"C": 1e-6, "initial_voltage": 0.0},
            ports={"p": "out", "n": "ground"}, equations=[],
        )
        return SimulationModel(components=[source, resistor, capacitor], nodes={"in", "out", "ground"})

    def _configuration(self, stop, step):
        return type("Config", (), {"settings": {"start": 0.0, "stop": stop, "step": step}})()

    def test_capacitor_discharges_through_resistor(self):
        result = TransientAnalysis().run(self._discharge_model(), configuration=self._configuration(0.002, 0.001))
        self.assertEqual(tuple(float(point) for point in result.points), (0.0, 0.001, 0.002))
        self.assertAlmostEqual(result.results[0].node_voltage("out"), 10.0, places=12)
        self.assertAlmostEqual(result.results[1].node_voltage("out"), 5.0, places=12)
        self.assertAlmostEqual(result.results[2].node_voltage("out"), 2.5, places=12)

    def test_initial_voltage_is_used_at_first_time_point(self):
        result = TransientAnalysis().run(self._discharge_model(initial_voltage=3.25), configuration=self._configuration(0.0, 0.001))
        self.assertAlmostEqual(result.results[0].node_voltage("out"), 3.25, places=12)

    def test_smaller_timestep_converges_toward_rc_solution(self):
        coarse = TransientAnalysis().run(self._charge_model(), configuration=self._configuration(0.002, 0.001))
        fine = TransientAnalysis().run(self._charge_model(), configuration=self._configuration(0.002, 0.0001))
        expected = 10.0 * (1.0 - math.exp(-2.0))
        coarse_error = abs(coarse.results[-1].node_voltage("out") - expected)
        fine_error = abs(fine.results[-1].node_voltage("out") - expected)
        self.assertLess(fine_error, coarse_error)

    def test_multiple_capacitors_keep_independent_dynamic_state(self):
        model = self._charge_model()
        c2 = SimulationComponent(
            name="C2", display_name="C2", component_id="c2", component_type="Capacitor",
            parameters={"C": 2e-6, "initial_voltage": 0.0}, ports={"p": "out", "n": "ground"}, equations=[],
        )
        model.add_component(c2)
        state = DynamicState({"c1": 1.0, "c2": 2.0})
        handler = CapacitorStateHandler()
        prepared = handler.prepare_step(model, state.snapshot(), TransientStepContext(time=0.001, previous_time=0.0, dt=0.001))
        capacitors = {c.component_id: c for c in prepared.components if c.component_type == "Capacitor"}
        self.assertIn("c1", capacitors)
        self.assertIn("c2", capacitors)
        self.assertNotEqual(repr(capacitors["c1"].equations[0]), repr(capacitors["c2"].equations[0]))


if __name__ == "__main__":
    unittest.main()
