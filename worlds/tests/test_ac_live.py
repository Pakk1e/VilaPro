import math
import unittest

from worlds.math import Binary, Equation, FunctionCall, Variable
from worlds.simulation import SimulationComponent, SimulationModel
from worlds.simulation.ac import ACConfiguration, solve_ac


class ACPhasorTest(unittest.TestCase):
    def _divider(self):
        source = SimulationComponent(
            name="V1", display_name="V1", component_id="v1", component_type="VoltageSource",
            parameters={"V": 10.0}, ports={"p": "in", "n": "ground"},
            equations=[Equation(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), right=Variable("V"))],
        )
        r1 = SimulationComponent(
            name="R1", display_name="R1", component_id="r1", component_type="Resistor",
            parameters={"R": 1000.0}, ports={"p": "in", "n": "out"},
            equations=[Equation(left=FunctionCall("current", (Variable("p"), Variable("n"))), right=Binary(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), operator="/", right=Variable("R")))],
        )
        r2 = SimulationComponent(
            name="R2", display_name="R2", component_id="r2", component_type="Resistor",
            parameters={"R": 1000.0}, ports={"p": "out", "n": "ground"},
            equations=[Equation(left=FunctionCall("current", (Variable("p"), Variable("n"))), right=Binary(left=FunctionCall("voltage", (Variable("p"), Variable("n"))), operator="/", right=Variable("R")))],
        )
        return SimulationModel(components=[source, r1, r2], nodes={"in", "out", "ground"})

    def test_unit_excitation_produces_linear_phasor(self):
        result = solve_ac(self._divider(), ACConfiguration(frequency=1000, amplitude=2, phase=30))
        out = result.values["V_node_out"]
        self.assertAlmostEqual(abs(out), 1.0, places=10)
        self.assertAlmostEqual(math.degrees(math.atan2(out.imag, out.real)), 30.0, places=10)
        self.assertEqual(result.source_id, "v1")

    def test_frequency_and_excitation_are_preserved(self):
        result = solve_ac(self._divider(), ACConfiguration(frequency=5000, amplitude=1.5, phase=-45))
        self.assertEqual(result.frequency, 5000)
        self.assertAlmostEqual(abs(result.excitation), 1.5, places=12)


if __name__ == "__main__":
    unittest.main()
