import unittest

from worlds.math import Binary, Equation, FunctionCall, Number, Variable
from worlds.simulation import SimulationComponent, SimulationConfiguration, SimulationModel, TransientAnalysis
from worlds.simulation.transient_validation import max_absolute_error, rc_voltage, relative_error, rl_current


class TransientValidationIntegrationTest(unittest.TestCase):
    """Compare real transient simulations with first-order analytical solutions."""

    def test_rc_charging_matches_analytical_solution(self):
        resistance = 1000.0
        capacitance = 1e-3
        source_voltage = 1.0
        step = 0.01
        stop = 1.0
        result = TransientAnalysis().run(
            self._rc_model(resistance, capacitance, source_voltage),
            configuration=self._configuration(stop, step),
        )

        actual = [point.instance("C1").voltage() for point in result.results if point is not None]
        expected = [rc_voltage(time, resistance, capacitance, source_voltage) for time in result.points]

        self.assertEqual(len(actual), len(expected))
        self.assertLess(max_absolute_error(actual, expected), 0.02)
        self.assertLess(relative_error(actual[-1], expected[-1]), 0.02)

    def test_rl_energizing_matches_analytical_solution(self):
        resistance = 10.0
        inductance = 1.0
        source_voltage = 1.0
        step = 0.01
        stop = 1.0
        result = TransientAnalysis().run(
            self._rl_model(resistance, inductance, source_voltage),
            configuration=self._configuration(stop, step),
        )

        actual = [point.instance("L1").current() for point in result.results if point is not None]
        expected = [rl_current(time, resistance, inductance, source_voltage) for time in result.points]

        self.assertEqual(len(actual), len(expected))
        self.assertLess(max_absolute_error(actual, expected), 0.01)
        self.assertLess(relative_error(actual[-1], expected[-1]), 0.02)

    def test_rc_smaller_step_reduces_analytical_error(self):
        resistance = 1000.0
        capacitance = 1e-3
        source_voltage = 1.0
        model = self._rc_model(resistance, capacitance, source_voltage)
        coarse = TransientAnalysis().run(model, configuration=self._configuration(1.0, 0.05))
        fine = TransientAnalysis().run(model, configuration=self._configuration(1.0, 0.01))

        coarse_actual = [point.instance("C1").voltage() for point in coarse.results if point is not None]
        coarse_expected = [rc_voltage(t, resistance, capacitance, source_voltage) for t in coarse.points]
        fine_actual = [point.instance("C1").voltage() for point in fine.results if point is not None]
        fine_expected = [rc_voltage(t, resistance, capacitance, source_voltage) for t in fine.points]

        coarse_error = max_absolute_error(coarse_actual, coarse_expected)
        fine_error = max_absolute_error(fine_actual, fine_expected)
        self.assertLess(fine_error, coarse_error)

    def test_rc_nonzero_initial_voltage_matches_analytical_solution(self):
        resistance = 1000.0
        capacitance = 1e-3
        source_voltage = 1.0
        initial_voltage = 0.25
        result = TransientAnalysis().run(
            self._rc_model(resistance, capacitance, source_voltage, initial_voltage=initial_voltage),
            configuration=self._configuration(1.0, 0.01),
        )

        actual = [point.instance("C1").voltage() for point in result.results if point is not None]
        expected = [rc_voltage(t, resistance, capacitance, source_voltage, initial_voltage) for t in result.points]
        self.assertLess(max_absolute_error(actual, expected), 0.02)
        self.assertAlmostEqual(actual[0], initial_voltage, places=12)

    def test_rl_nonzero_initial_current_matches_analytical_solution(self):
        resistance = 10.0
        inductance = 1.0
        source_voltage = 1.0
        initial_current = 0.05
        result = TransientAnalysis().run(
            self._rl_model(resistance, inductance, source_voltage, initial_current=initial_current),
            configuration=self._configuration(1.0, 0.01),
        )

        actual = [point.instance("L1").current() for point in result.results if point is not None]
        expected = [rl_current(t, resistance, inductance, source_voltage, initial_current) for t in result.points]
        self.assertLess(max_absolute_error(actual, expected), 0.01)
        self.assertAlmostEqual(actual[0], initial_current, places=12)

    @staticmethod
    def _configuration(stop, step):
        return SimulationConfiguration.from_dict({
            "analysis": "transient",
            "settings": {"start": 0.0, "stop": stop, "step": step},
        })

    @staticmethod
    def _rc_model(resistance, capacitance, source_voltage, initial_voltage=0.0):
        return SimulationModel(
            components=[
                TransientValidationIntegrationTest._source("VS", "node_in", source_voltage),
                TransientValidationIntegrationTest._resistor("R1", "node_in", "out", resistance),
                SimulationComponent(
                    name="C1", display_name="C1", component_id="c1", component_type="Capacitor",
                    parameters={"C": capacitance, "initial_voltage": initial_voltage},
                    ports={"p": "out", "n": "ground"}, equations=[],
                ),
            ],
            nodes={"node_in", "out", "ground"},
        )

    @staticmethod
    def _rl_model(resistance, inductance, source_voltage, initial_current=0.0):
        return SimulationModel(
            components=[
                TransientValidationIntegrationTest._source("VS", "node_in", source_voltage),
                TransientValidationIntegrationTest._resistor("R1", "node_in", "out", resistance),
                SimulationComponent(
                    name="L1", display_name="L1", component_id="l1", component_type="Inductor",
                    parameters={"L": inductance, "initial_current": initial_current},
                    ports={"p": "out", "n": "ground"}, equations=[],
                ),
            ],
            nodes={"node_in", "out", "ground"},
        )

    @staticmethod
    def _source(name, node, voltage):
        return SimulationComponent(
            name=name, display_name=name, component_id=name.lower(), component_type="VoltageSource",
            parameters={"V": voltage}, ports={"p": node, "n": "ground"},
            equations=[Equation(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), right=Number(voltage))],
        )

    @staticmethod
    def _resistor(name, p, n, resistance):
        return SimulationComponent(
            name=name, display_name=name, component_id=name.lower(), component_type="Resistor",
            parameters={"R": resistance}, ports={"p": p, "n": n},
            equations=[Equation(
                left=FunctionCall("voltage", (Variable("p"), Variable("n"))),
                right=Binary(left=FunctionCall("current", (Variable("p"), Variable("n"))), operator="*", right=Number(resistance)),
            )],
        )


if __name__ == "__main__":
    unittest.main()
