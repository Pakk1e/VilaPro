import unittest

from worlds.simulation.result import SimulationResultModel
from worlds.simulation.series_factory import SimulationSeriesFactory


class SimulationSeriesFactoryComponentsTest(unittest.TestCase):
    def test_transient_component_voltage_current_and_power_are_series(self):
        result = SimulationResultModel.from_transient(
            status="completed",
            settings={"stop": 1.0, "step": 0.5},
            outputs=(),
            points=[0.0, 0.5, 1.0],
            point_statuses=[{"status": "completed"}] * 3,
            node_voltages=[{}, {}, {}],
            branch_currents=[{}, {}, {}],
            components=[
                [{"id": "r1", "name": "R1", "voltage": 1.0, "current": 0.1, "power": 0.1}],
                [{"id": "r1", "name": "R1", "voltage": 2.0, "current": 0.2, "power": 0.4}],
                [{"id": "r1", "name": "R1", "voltage": 3.0, "current": 0.3, "power": 0.9}],
            ],
        )
        series = SimulationSeriesFactory().from_result(result)
        by_id = {item.id: item for item in series}
        self.assertEqual(by_id["components:r1:voltage"].quantity, "voltage")
        self.assertEqual(by_id["components:r1:voltage"].unit, "V")
        self.assertEqual(by_id["components:r1:voltage"].y, (1.0, 2.0, 3.0))
        self.assertEqual(by_id["components:r1:current"].y, (0.1, 0.2, 0.3))
        self.assertEqual(by_id["components:r1:power"].y, (0.1, 0.4, 0.9))

    def test_missing_component_point_is_preserved(self):
        result = SimulationResultModel.from_transient(
            status="completed_with_failures",
            settings={}, outputs=(),
            points=[0.0, 1.0, 2.0],
            point_statuses=[{"status": "completed"}, {"status": "failed"}, {"status": "completed"}],
            node_voltages=[{}, None, {}], branch_currents=[{}, None, {}],
            components=[
                [{"id": "c1", "name": "C1", "voltage": 0.0, "current": 0.0, "power": 0.0}],
                None,
                [{"id": "c1", "name": "C1", "voltage": 1.0, "current": 0.2, "power": 0.2}],
            ],
        )
        voltage = next(item for item in SimulationSeriesFactory().from_result(result) if item.id == "components:c1:voltage")
        self.assertEqual(voltage.x, (0.0, 1.0, 2.0))
        self.assertEqual(voltage.y, (0.0, None, 1.0))


if __name__ == "__main__":
    unittest.main()
