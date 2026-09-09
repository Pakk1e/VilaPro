import unittest

from worlds.math import Binary, Equation, FunctionCall, Number, Variable
from worlds.simulation import (
    SimulationComponent,
    SimulationModel,
    TransientAnalysis,
    TransientConfiguration,
    TransientStepContext,
    DynamicState,
    DynamicStateSnapshot,
    CapacitorTransientModel,
)
from worlds.simulation.dynamic import DynamicComponentError, CapacitorStateHandler


class CapacitorTransientTest(unittest.TestCase):
    def _model(self):
        source = SimulationComponent(
            name="V1",
            display_name="V1",
            component_id="v1",
            component_type="VoltageSource",
            parameters={"V": 10.0},
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
            parameters={"R": 1000.0},
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
            parameters={"C": 1e-6, "initial_voltage": 0.0},
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
            CapacitorTransientModel().capacitance(
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
