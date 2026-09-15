import unittest

from worlds.math import Binary, Equation, FunctionCall, Variable
from worlds.simulation import (
    SimulationComponent,
    SimulationModel,
    TransientAnalysis,
    TransientStepContext,
    DynamicState,
    CapacitorTransientModel,
)
from worlds.simulation.dynamic import DynamicComponentError, CapacitorStateHandler


class CapacitorTransientTest(unittest.TestCase):
    def _model(self, *, initial_voltage=0.0, capacitance=1e-6, resistance=1000.0, source_voltage=10.0):
        source = SimulationComponent(
            name="V1",
            display_name="V1",
            component_id="v1",
            component_type="VoltageSource",
            parameters={"V": source_voltage},
            ports={"p": "in", "n": "ground"},
            equations=[
                Equation(
                    left=FunctionCall("voltage", (Variable("p"), Variable("n"))),
                    right=Variable("V"),
                )
            ],
        )
        resistor = SimulationComponent(
            name="R1",
            display_name="R1",
            component_id="r1",
            component_type="Resistor",
            parameters={"R": resistance},
            ports={"p": "in", "n": "out"},
            equations=[
                Equation(
                    left=FunctionCall("current", (Variable("p"), Variable("n"))),
                    right=Binary(
                        left=FunctionCall("voltage", (Variable("p"), Variable("n"))),
                        operator="/",
                        right=Variable("R"),
                    ),
                )
            ],
        )
        capacitor = SimulationComponent(
            name="C1",
            display_name="C1",
            component_id="c1",
            component_type="Capacitor",
            parameters={"C": capacitance, "initial_voltage": initial_voltage},
            ports={"p": "out", "n": "ground"},
            equations=[],
        )
        return SimulationModel(components=[source, resistor, capacitor], nodes={"in", "out", "ground"})

    def test_capacitor_representation_metadata(self):
        representation = CapacitorTransientModel(capacitance=1e-6)
        self.assertEqual(representation.component_type, "Capacitor")
        self.assertEqual(representation.layer, "electrical")
        self.assertEqual(representation.analysis, "transient")
        self.assertEqual(representation.method, "backward_euler")

    def test_rc_transient_uses_previous_capacitor_voltage(self):
        configuration = type("Config", (), {"settings": {"start": 0.0, "stop": 0.002, "step": 0.001}})()
        result = TransientAnalysis().run(self._model(), configuration=configuration)

        self.assertEqual(len(result.points), 3)
        self.assertIsNotNone(result.results[0])
        self.assertIsNotNone(result.results[1])
        self.assertIsNotNone(result.results[2])

        v0 = result.results[0].node_voltage("out")
        v1 = result.results[1].node_voltage("out")
        v2 = result.results[2].node_voltage("out")
        self.assertAlmostEqual(v0, 0.0, places=12)
        self.assertAlmostEqual(v1, 5.0, places=12)
        self.assertAlmostEqual(v2, 7.5, places=12)

    def test_initial_voltage_is_preserved_before_first_dynamic_step(self):
        configuration = type("Config", (), {"settings": {"start": 0.0, "stop": 0.001, "step": 0.001}})()
        result = TransientAnalysis().run(self._model(initial_voltage=3.25), configuration=configuration)
        self.assertAlmostEqual(result.results[0].instance("C1").voltage(), 3.25, places=12)
        self.assertAlmostEqual(result.state_snapshots[0].get("c1"), 3.25, places=12)

    def test_capacitor_can_discharge_from_initial_voltage(self):
        configuration = type("Config", (), {"settings": {"start": 0.0, "stop": 0.001, "step": 0.001}})()
        result = TransientAnalysis().run(
            self._model(initial_voltage=1.0, source_voltage=0.0),
            configuration=configuration,
        )
        self.assertAlmostEqual(result.results[0].instance("C1").voltage(), 1.0, places=12)
        self.assertAlmostEqual(result.results[1].instance("C1").voltage(), 0.5, places=12)
        self.assertAlmostEqual(result.state_snapshots[1].get("c1"), 0.5, places=12)

    def test_timestep_changes_backward_euler_trajectory(self):
        coarse = type("Config", (), {"settings": {"start": 0.0, "stop": 0.001, "step": 0.001}})()
        fine = type("Config", (), {"settings": {"start": 0.0, "stop": 0.001, "step": 0.0005}})()
        coarse_result = TransientAnalysis().run(self._model(), configuration=coarse)
        fine_result = TransientAnalysis().run(self._model(), configuration=fine)
        coarse_final = coarse_result.results[-1].instance("C1").voltage()
        fine_final = fine_result.results[-1].instance("C1").voltage()
        self.assertAlmostEqual(coarse_final, 5.0, places=12)
        self.assertAlmostEqual(fine_final, 5.555555555555556, places=12)
        self.assertNotEqual(coarse_final, fine_final)

    def test_multiple_capacitors_keep_independent_dynamic_state(self):
        source1 = SimulationComponent(
            name="V1", display_name="V1", component_id="v1", component_type="VoltageSource",
            parameters={"V": 10.0}, ports={"p": "in1", "n": "ground"},
            equations=[Equation(FunctionCall("voltage", (Variable("p"), Variable("n"))), Variable("V"))],
        )
        source2 = SimulationComponent(
            name="V2", display_name="V2", component_id="v2", component_type="VoltageSource",
            parameters={"V": 10.0}, ports={"p": "in2", "n": "ground"},
            equations=[Equation(FunctionCall("voltage", (Variable("p"), Variable("n"))), Variable("V"))],
        )
        resistor1 = SimulationComponent(
            name="R1", display_name="R1", component_id="r1", component_type="Resistor",
            parameters={"R": 1000.0}, ports={"p": "in1", "n": "out1"},
            equations=[Equation(FunctionCall("current", (Variable("p"), Variable("n"))), Binary(FunctionCall("voltage", (Variable("p"), Variable("n"))), "/", Variable("R")))],
        )
        resistor2 = SimulationComponent(
            name="R2", display_name="R2", component_id="r2", component_type="Resistor",
            parameters={"R": 1000.0}, ports={"p": "in2", "n": "out2"},
            equations=[Equation(FunctionCall("current", (Variable("p"), Variable("n"))), Binary(FunctionCall("voltage", (Variable("p"), Variable("n"))), "/", Variable("R")))],
        )
        capacitor1 = SimulationComponent(
            name="C1", display_name="C1", component_id="c1", component_type="Capacitor",
            parameters={"C": 1e-6, "initial_voltage": 0.0}, ports={"p": "out1", "n": "ground"}, equations=[],
        )
        capacitor2 = SimulationComponent(
            name="C2", display_name="C2", component_id="c2", component_type="Capacitor",
            parameters={"C": 2e-6, "initial_voltage": 0.0}, ports={"p": "out2", "n": "ground"}, equations=[],
        )
        model = SimulationModel(
            components=[source1, source2, resistor1, resistor2, capacitor1, capacitor2],
            nodes={"in1", "out1", "in2", "out2", "ground"},
        )
        configuration = type("Config", (), {"settings": {"start": 0.0, "stop": 0.001, "step": 0.001}})()
        result = TransientAnalysis().run(model, configuration=configuration)
        first_step = result.results[1]
        self.assertAlmostEqual(first_step.instance("C1").voltage(), 5.0, places=12)
        self.assertAlmostEqual(first_step.instance("C2").voltage(), 3.333333333333335, places=12)
        self.assertAlmostEqual(result.state_snapshots[1].get("c1"), 5.0, places=12)
        self.assertAlmostEqual(result.state_snapshots[1].get("c2"), 3.333333333333335, places=12)

    def test_failed_step_does_not_commit_dynamic_state(self):
        model = self._model()
        handler = CapacitorStateHandler()
        state = DynamicState({"c1": 2.5})
        snapshot = state.snapshot()
        context = TransientStepContext(time=0.001, previous_time=0.0, dt=0.001)
        prepared = handler.prepare_step(model, snapshot, context)
        capacitor = next(component for component in prepared.components if component.component_id == "c1")
        self.assertIn("current", repr(capacitor.equations[0].left))
        self.assertEqual(state.snapshot().get("c1"), 2.5)

    def test_invalid_capacitance_is_rejected(self):
        with self.assertRaises(DynamicComponentError):
            CapacitorTransientModel(capacitance=1e-6).capacitance(
                SimulationComponent(
                    name="C1",
                    display_name="C1",
                    component_id="c1",
                    component_type="Capacitor",
                    parameters={"C": 0.0},
                    ports={"p": "a", "n": "ground"},
                )
            )


if __name__ == "__main__":
    unittest.main()