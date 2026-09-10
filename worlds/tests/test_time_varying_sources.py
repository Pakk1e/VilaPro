import unittest

from worlds.math import Equation, FunctionCall, Number, Variable

from worlds.simulation.analysis import SimulationConfiguration, TransientAnalysis
from worlds.simulation.dynamic import DynamicComponentError, TransientDynamicStateHandler
from worlds.simulation.model import SimulationComponent, SimulationModel
from worlds.simulation.state import DynamicStateSnapshot, TransientStepContext
from worlds.simulation.time_varying import TimeVaryingSource, TimeVaryingSourceError


class TimeVaryingSourceTest(unittest.TestCase):
    def test_sine_source_evaluates_at_time(self):
        source = TimeVaryingSource(
            waveform="sine", amplitude=10.0, offset=2.0, frequency=1.0
        )
        self.assertAlmostEqual(source.value_at(0.0), 2.0)
        self.assertAlmostEqual(source.value_at(0.25), 12.0)
        self.assertAlmostEqual(source.value_at(0.5), 2.0)
        self.assertAlmostEqual(source.value_at(0.75), -8.0)

    def test_square_source_evaluates_with_delay(self):
        source = TimeVaryingSource(
            waveform="square", amplitude=5.0, offset=1.0, frequency=1.0, delay=0.25
        )
        self.assertAlmostEqual(source.value_at(0.2), 1.0)
        self.assertAlmostEqual(source.value_at(0.25), 6.0)
        self.assertAlmostEqual(source.value_at(0.75), -4.0)

    def test_invalid_periodic_source_is_rejected(self):
        with self.assertRaises(TimeVaryingSourceError):
            TimeVaryingSource(waveform="sine", amplitude=1.0, frequency=0.0)

    def test_transient_handler_applies_source_at_step_time(self):
        source = SimulationComponent(
            name="V1",
            display_name="V1",
            component_id="v1",
            component_type="VoltageSource",
            parameters={
                "V": {
                    "waveform": "sine",
                    "amplitude": 10.0,
                    "offset": 1.0,
                    "frequency": 1.0,
                }
            },
            ports={"p": "out", "n": "ground"},
            equations=[],
        )
        model = SimulationModel(components=[source], nodes={"out", "ground"})
        context = TransientStepContext(time=0.25, previous_time=0.0, dt=0.25)
        prepared = TransientDynamicStateHandler().prepare_step(
            model, DynamicStateSnapshot({}), context
        )
        self.assertAlmostEqual(prepared.components[0].parameters["V"], 11.0)
        self.assertIsInstance(prepared.components[0].parameters["V"], float)

    def test_transient_analysis_solves_with_time_varying_voltage_source(self):
        source = SimulationComponent(
            name="VoltageSource_1",
            display_name="V1",
            component_id="v1",
            component_type="VoltageSource",
            parameters={
                "V": {
                    "waveform": "sine",
                    "amplitude": 10.0,
                    "offset": 1.0,
                    "frequency": 1.0,
                }
            },
            ports={"p": "out", "n": "ground"},
            equations=[
                Equation(
                    left=FunctionCall("voltage", (Variable("p"), Variable("n"))),
                    right=Variable("V"),
                )
            ],
        )
        resistor = SimulationComponent(
            name="Resistor_1",
            display_name="R1",
            component_id="r1",
            component_type="Resistor",
            parameters={"R": 100.0},
            ports={"p": "out", "n": "ground"},
            equations=[
                Equation(
                    left=FunctionCall("voltage", (Variable("p"), Variable("n"))),
                    right=FunctionCall("current", (Variable("p"), Variable("n"))),
                )
            ],
        )
        model = SimulationModel(
            components=[source, resistor], nodes={"out", "ground"}
        )
        configuration = SimulationConfiguration(
            analysis="transient",
            settings={"start": 0.0, "stop": 0.25, "step": 0.25},
        )
        result = TransientAnalysis().run(model, configuration=configuration)
        self.assertEqual(result.points, (0.0, 0.25))
        self.assertIsNotNone(result.results[1])
        self.assertAlmostEqual(
            result.results[1].instance("VoltageSource_1").voltage(), 11.0
        )

    def test_invalid_source_fails_as_dynamic_configuration_error(self):
        source = SimulationComponent(
            name="V1",
            display_name="V1",
            component_id="v1",
            component_type="VoltageSource",
            parameters={"V": {"waveform": "sine", "amplitude": 1.0}},
            ports={"p": "out", "n": "ground"},
            equations=[],
        )
        model = SimulationModel(components=[source], nodes={"out", "ground"})
        context = TransientStepContext(time=0.1, previous_time=None, dt=None)
        with self.assertRaises(DynamicComponentError):
            TransientDynamicStateHandler().prepare_step(
                model, DynamicStateSnapshot({}), context
            )


if __name__ == "__main__":
    unittest.main()
