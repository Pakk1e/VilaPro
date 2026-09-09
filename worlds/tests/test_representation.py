import unittest

from worlds.simulation import (
    CapacitorTransientModel,
    ComponentRepresentation,
    ComponentRepresentationError,
    ElectricalComponentRepresentation,
)


class ComponentRepresentationTest(unittest.TestCase):
    def test_generic_representation_requires_component_type(self):
        with self.assertRaises(ComponentRepresentationError):
            ComponentRepresentation("")

    def test_generic_representation_defaults_to_generic_layer(self):
        representation = ComponentRepresentation("Resistor")
        self.assertEqual(representation.component_type, "Resistor")
        self.assertEqual(representation.layer, "generic")

    def test_electrical_representation_has_electrical_layer(self):
        representation = ElectricalComponentRepresentation("Resistor")
        self.assertEqual(representation.component_type, "Resistor")
        self.assertEqual(representation.layer, "electrical")

    def test_capacitor_transient_model_is_electrical_representation(self):
        representation = CapacitorTransientModel()
        self.assertEqual(representation.component_type, "Capacitor")
        self.assertEqual(representation.layer, "electrical")
        self.assertEqual(representation.method, "backward_euler")


if __name__ == "__main__":
    unittest.main()
