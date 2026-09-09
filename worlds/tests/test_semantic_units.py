import unittest

from worlds.semantics import WorldSemanticAnalyzer, WorldSemanticError
from worlds.vdl import Parser


class SemanticUnitDimensionTest(unittest.TestCase):
    def test_derived_electrical_units_match_quantity_dimensions(self):
        source = """
        world Units {
            quantity Current { dimension: I; unit: A; }
            quantity Power { dimension: M * L^2 / T^3; unit: W; }
            quantity Voltage { dimension: Power / Current; unit: V; }
            quantity Resistance { dimension: Voltage / Current; unit: Ohm; }
            quantity Capacitance { dimension: Current * T / Voltage; unit: F; }
        }
        """
        world = Parser(source).parse()
        semantic = WorldSemanticAnalyzer(world).analyze()

        self.assertEqual(semantic.quantity_symbol("Capacitance").unit.symbol, "F")

    def test_real_dimension_mismatch_is_still_rejected(self):
        source = """
        world Units {
            quantity Capacitance { dimension: I; unit: F; }
        }
        """
        with self.assertRaises(WorldSemanticError):
            WorldSemanticAnalyzer(Parser(source).parse()).analyze()


if __name__ == "__main__":
    unittest.main()
