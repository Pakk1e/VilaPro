import unittest

from worlds.math import Binary, Equation, FunctionCall, Number, Variable
from worlds.simulation import (
    DynamicStateSnapshot,
    SimulationComponent,
    SimulationConfiguration,
    SimulationModel,
    TransientAnalysis,
    TransientStepContext,
)
from worlds.simulation.dynamic import CapacitorStateHandler, DynamicComponentError, InductorStateHandler


class CapacitorModelTest(unittest.TestCase):
    def capacitor(self, **parameters):
        values = {"C": 1.0, **parameters}
        return SimulationComponent(
            name="C1",
            display_name="C1",
            component_id="C1",
            component_type="Capacitor",
            parameters=values,
            ports={"p": "out", "n": "ground"},
            equations=[],
        )

    def test_requires_positive_capacitance(self):
        handler = CapacitorStateHandler()
        model = SimulationModel(components=[self.capacitor(C=0)], nodes={"out", "ground"})
        with self.assertRaises(DynamicComponentError):
            handler.prepare_step(model, DynamicStateSnapshot({}), context(0.0))

    def test_initial_step_enforces_initial_voltage(self):
        handler = CapacitorStateHandler()
        model = SimulationModel(components=[self.capacitor(C=2.0, initial_voltage=3.5)], nodes={"out", "ground"})
        prepared = handler.prepare_step(model, DynamicStateSnapshot({}), context(0.0))
        equation = prepared.components[0].equations[0]
        self.assertIsInstance(equation.right, Number)
        self.assertEqual(equation.right.value, 3.5)
        self.assertEqual(equation.left.name, "voltage")

    def test_next_step_uses_backward_euler_companion_model(self):
        handler = CapacitorStateHandler()
        model = SimulationModel(components=[self.capacitor(C=2.0)], nodes={"out", "ground"})
        prepared = handler.prepare_step(model, DynamicStateSnapshot({"C1": 3.0}), context(0.5, 0.0))
        equation = prepared.components[0].equations[0]
        self.assertEqual(equation.left.name, "current")
        self.assertEqual(equation.right.left.value, 4.0)
        self.assertEqual(equation.right.right.right.value, 3.0)

    def test_prepare_does_not_mutate_previous_state(self):
        handler = CapacitorStateHandler()
        previous = DynamicStateSnapshot({"C1": 2.0})
        model = SimulationModel(components=[self.capacitor()], nodes={"out", "ground"})
        handler.prepare_step(model, previous, context(1.0, 0.0))
        self.assertEqual(previous.get("C1"), 2.0)


class CapacitorTransientIntegrationTest(unittest.TestCase):
    def test_rc_circuit_uses_previous_capacitor_voltage(self):
        source = SimulationComponent(
            name="V1", display_name="V1", component_id="V1", component_type="VoltageSource",
            parameters={"V": 1.0}, ports={"p": "source", "n": "ground"},
            equations=[Equation(FunctionCall("voltage", (Variable("p"), Variable("n"))), Variable("V"))],
        )
        resistor = SimulationComponent(
            name="R1", display_name="R1", component_id="R1", component_type="Resistor",
            parameters={"R": 1.0}, ports={"p": "source", "n": "out"},
            equations=[Equation(
                FunctionCall("current", (Variable("p"), Variable("n"))),
                Binary(FunctionCall("voltage", (Variable("p"), Variable("n"))), "/", Variable("R")),
            )],
        )
        capacitor = SimulationComponent(
            name="C1", display_name="C1", component_id="C1", component_type="Capacitor",
            parameters={"C": 1.0, "initial_voltage": 0.0}, ports={"p": "out", "n": "ground"}, equations=[],
        )
        model = SimulationModel(components=[source, resistor, capacitor], nodes={"source", "out", "ground"})
        configuration = SimulationConfiguration.from_dict({"analysis": "transient", "settings": {"start": 0, "stop": 1, "step": 1}})
        result = TransientAnalysis().run(model, configuration=configuration)
        self.assertEqual(len(result.results), 2)
        self.assertAlmostEqual(result.results[0].instance("C1").voltage(), 0.0)
        self.assertAlmostEqual(result.results[1].instance("C1").voltage(), 0.5)
        self.assertAlmostEqual(result.results[1].instance("C1").current(), 0.5)
        self.assertAlmostEqual(result.state_snapshots[1].get("C1"), 0.5)


class InductorModelTest(unittest.TestCase):
    def inductor(self, **parameters):
        values = {"L": 1.0, **parameters}
        return SimulationComponent(
            name="L1",
            display_name="L1",
            component_id="L1",
            component_type="Inductor",
            parameters=values,
            ports={"p": "out", "n": "ground"},
            equations=[],
        )

    def test_requires_positive_inductance(self):
        handler = InductorStateHandler()
        model = SimulationModel(components=[self.inductor(L=0)], nodes={"out", "ground"})
        with self.assertRaises(DynamicComponentError):
            handler.prepare_step(model, DynamicStateSnapshot({}), context(0.0))

    def test_initial_step_enforces_initial_current(self):
        handler = InductorStateHandler()
        model = SimulationModel(components=[self.inductor(L=2.0, initial_current=3.5)], nodes={"out", "ground"})
        prepared = handler.prepare_step(model, DynamicStateSnapshot({}), context(0.0))
        equation = prepared.components[0].equations[0]
        self.assertEqual(equation.left.name, "current")
        self.assertIsInstance(equation.right, Number)
        self.assertEqual(equation.right.value, 3.5)

    def test_next_step_uses_backward_euler_companion_model(self):
        handler = InductorStateHandler()
        model = SimulationModel(components=[self.inductor(L=2.0)], nodes={"out", "ground"})
        prepared = handler.prepare_step(model, DynamicStateSnapshot({"L1": 3.0}), context(0.5, 0.0))
        equation = prepared.components[0].equations[0]
        self.assertEqual(equation.left.name, "current")
        self.assertEqual(equation.right.left.left.value, 0.25)
        self.assertEqual(equation.right.right.value, 3.0)

    def test_prepare_does_not_mutate_previous_state(self):
        handler = InductorStateHandler()
        previous = DynamicStateSnapshot({"L1": 2.0})
        model = SimulationModel(components=[self.inductor()], nodes={"out", "ground"})
        handler.prepare_step(model, previous, context(1.0, 0.0))
        self.assertEqual(previous.get("L1"), 2.0)


class InductorTransientIntegrationTest(unittest.TestCase):
    def test_rl_circuit_uses_previous_inductor_current(self):
        source = SimulationComponent(
            name="V1", display_name="V1", component_id="V1", component_type="VoltageSource",
            parameters={"V": 1.0}, ports={"p": "source", "n": "ground"},
            equations=[Equation(FunctionCall("voltage", (Variable("p"), Variable("n"))), Variable("V"))],
        )
        resistor = SimulationComponent(
            name="R1", display_name="R1", component_id="R1", component_type="Resistor",
            parameters={"R": 1.0}, ports={"p": "source", "n": "out"},
            equations=[Equation(
                FunctionCall("current", (Variable("p"), Variable("n"))),
                Binary(FunctionCall("voltage", (Variable("p"), Variable("n"))), "/", Variable("R")),
            )],
        )
        inductor = SimulationComponent(
            name="L1", display_name="L1", component_id="L1", component_type="Inductor",
            parameters={"L": 1.0, "initial_current": 0.0}, ports={"p": "out", "n": "ground"}, equations=[],
        )
        model = SimulationModel(components=[source, resistor, inductor], nodes={"source", "out", "ground"})
        configuration = SimulationConfiguration.from_dict({"analysis": "transient", "settings": {"start": 0, "stop": 2, "step": 1}})
        result = TransientAnalysis().run(model, configuration=configuration)
        self.assertEqual(len(result.results), 3)
        self.assertAlmostEqual(result.results[0].instance("L1").current(), 0.0)
        self.assertAlmostEqual(result.results[1].instance("L1").current(), 0.5)
        self.assertAlmostEqual(result.results[2].instance("L1").current(), 0.75)
        self.assertAlmostEqual(result.state_snapshots[1].get("L1"), 0.5)
        self.assertAlmostEqual(result.state_snapshots[2].get("L1"), 0.75)


def context(time_value, previous_time=None):
    return TransientStepContext(
        time=time_value,
        previous_time=previous_time,
        dt=None if previous_time is None else time_value - previous_time,
    )


if __name__ == "__main__":
    unittest.main()
