import unittest

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
