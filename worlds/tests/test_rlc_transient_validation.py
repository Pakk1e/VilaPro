import math
import unittest

from worlds.math import Binary, Equation, FunctionCall, Variable
from worlds.simulation import SimulationComponent, SimulationModel, TransientAnalysis
from worlds.simulation.transient_validation import max_absolute_error


class RLCTransientValidationTest(unittest.TestCase):
    """Validate the coupled RLC transient against the analytical step response."""

    @staticmethod
    def _model(*, initial_voltage=0.0, initial_current=0.0):
        source = SimulationComponent(
            name="V1", display_name="V1", component_id="v1", component_type="VoltageSource",
            parameters={"V": 1.0}, ports={"p": "in", "n": "ground"},
            equations=[Equation(
                left=FunctionCall("voltage", (Variable("p"), Variable("n"))), right=Variable("V")
            )],
        )
        resistor = SimulationComponent(
            name="R1", display_name="R1", component_id="r1", component_type="Resistor",
            parameters={"R": 1.0}, ports={"p": "in", "n": "l"},
            equations=[Equation(
                left=FunctionCall("current", (Variable("p"), Variable("n"))),
                right=Binary(
                    left=FunctionCall("voltage", (Variable("p"), Variable("n"))),
                    operator="/", right=Variable("R"),
                ),
            )],
        )
        inductor = SimulationComponent(
            name="L1", display_name="L1", component_id="l1", component_type="Inductor",
            parameters={"L": 1e-2, "initial_current": initial_current},
            ports={"p": "l", "n": "out"}, equations=[],
        )
        capacitor = SimulationComponent(
            name="C1", display_name="C1", component_id="c1", component_type="Capacitor",
            parameters={"C": 1e-3, "initial_voltage": initial_voltage},
            ports={"p": "out", "n": "ground"}, equations=[],
        )
        return SimulationModel(
            components=[source, resistor, inductor, capacitor],
            nodes={"in", "l", "out", "ground"},
        )

    @staticmethod
    def _configuration(stop, step):
        return type("Config", (), {"settings": {"start": 0.0, "stop": stop, "step": step}})()

    @staticmethod
    def _analytical_current(time):
        resistance, inductance, capacitance, source_voltage = 1.0, 1e-2, 1e-3, 1.0
        alpha = resistance / (2.0 * inductance)
        omega_0 = 1.0 / math.sqrt(inductance * capacitance)
        omega_d = math.sqrt(omega_0**2 - alpha**2)
        return (
            source_voltage / (inductance * omega_d)
            * math.exp(-alpha * time)
            * math.sin(omega_d * time)
        )

    @staticmethod
    def _analytical_voltage(time):
        resistance, inductance, capacitance, source_voltage = 1.0, 1e-2, 1e-3, 1.0
        alpha = resistance / (2.0 * inductance)
        omega_0 = 1.0 / math.sqrt(inductance * capacitance)
        omega_d = math.sqrt(omega_0**2 - alpha**2)
        return source_voltage * (
            1.0
            - math.exp(-alpha * time)
            * (math.cos(omega_d * time) + alpha / omega_d * math.sin(omega_d * time))
        )

    def test_zero_initial_rlc_matches_analytical_step_response(self):
        # Backward Euler has first-order truncation error. Use a timestep small
        # enough that the validation threshold measures the circuit behavior
        # rather than dominating the result with discretization error.
        simulation = TransientAnalysis().run(
            self._model(), configuration=self._configuration(0.01, 0.00001)
        )
        self.assertTrue(all(result is not None for result in simulation.results))

        sample_indices = (100, 250, 500, 750, 1000)
        actual_current = [simulation.results[i].instance("L1").current() for i in sample_indices]
        expected_current = [self._analytical_current(float(simulation.points[i])) for i in sample_indices]
        actual_voltage = [simulation.results[i].node_voltage("out") for i in sample_indices]
        expected_voltage = [self._analytical_voltage(float(simulation.points[i])) for i in sample_indices]

        self.assertLess(max_absolute_error(actual_current, expected_current), 0.01)
        self.assertLess(max_absolute_error(actual_voltage, expected_voltage), 0.01)

    def test_finer_timestep_reduces_rlc_current_error(self):
        coarse = TransientAnalysis().run(
            self._model(), configuration=self._configuration(0.01, 0.0002)
        )
        fine = TransientAnalysis().run(
            self._model(), configuration=self._configuration(0.01, 0.0001)
        )
        expected = self._analytical_current(0.01)
        coarse_error = abs(coarse.results[-1].instance("L1").current() - expected)
        fine_error = abs(fine.results[-1].instance("L1").current() - expected)
        self.assertLess(fine_error, coarse_error)

    def test_rlc_preserves_nonzero_initial_conditions_at_start(self):
        simulation = TransientAnalysis().run(
            self._model(initial_voltage=0.25, initial_current=0.125),
            configuration=self._configuration(0.0, 0.0001),
        )
        self.assertAlmostEqual(simulation.results[0].node_voltage("out"), 0.25, places=12)
        self.assertAlmostEqual(simulation.results[0].instance("L1").current(), 0.125, places=12)


if __name__ == "__main__":
    unittest.main()
