import unittest

from worlds.simulation import SimulationSeries
from worlds.simulation.series_selection import SimulationSeriesSelectionError, filter_series_by_quantity, select_series


class SimulationSeriesSelectionTest(unittest.TestCase):
    def setUp(self):
        self.voltage = SimulationSeries.from_values(id="v:out", label="V(out)", x=[0, 1], y=[0, 5], quantity="voltage", unit="V", source="node:out")
        self.current = SimulationSeries.from_values(id="i:r1", label="I(R1)", x=[0, 1], y=[0, 1], quantity="current", unit="A", source="branch:R1")

    def test_default_selection_preserves_order(self):
        self.assertEqual(select_series((self.voltage, self.current)), (self.voltage, self.current))

    def test_requested_selection_preserves_requested_order(self):
        self.assertEqual(select_series((self.voltage, self.current), ("i:r1", "v:out")), (self.current, self.voltage))

    def test_unknown_id_is_rejected(self):
        with self.assertRaises(SimulationSeriesSelectionError):
            select_series((self.voltage,), ("missing",))

    def test_duplicate_requested_id_is_rejected(self):
        with self.assertRaises(SimulationSeriesSelectionError):
            select_series((self.voltage,), ("v:out", "v:out"))

    def test_quantity_filter(self):
        self.assertEqual(filter_series_by_quantity((self.voltage, self.current), "voltage"), (self.voltage,))


if __name__ == "__main__":
    unittest.main()
