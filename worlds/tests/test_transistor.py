import unittest

from worlds.simulation import SimulationService


def world_source():
    with open("examples/electronics.vdl") as file:
        return file.read()


def instances(vbb=1.7, vcc=12.0):
    return [
        {"id": "VCC", "name": "VCC", "type": "VoltageSource", "parameters": {"V": vcc}, "ports": {"p": "collector_supply", "n": "ground"}},
        {"id": "RC", "name": "Collector resistor", "type": "Resistor", "parameters": {"R": 1000.0}, "ports": {"p": "collector_supply", "n": "collector"}},
        {"id": "VBB", "name": "VBB", "type": "VoltageSource", "parameters": {"V": vbb}, "ports": {"p": "base_supply", "n": "ground"}},
        {"id": "RB", "name": "Base resistor", "type": "Resistor", "parameters": {"R": 10000.0}, "ports": {"p": "base_supply", "n": "base"}},
        {"id": "Q1", "name": "Q1", "type": "NPNTransistor", "parameters": {"Vbe": 0.7, "VceSat": 0.2, "Beta": 100.0}, "ports": {"b": "base", "c": "collector", "e": "ground"}},
    ]


class NPNTransistorSimulationTest(unittest.TestCase):
    def test_forward_active_bias(self):
        response = SimulationService().simulate(world_source(), instances())
        transistor = next(item for item in response.components if item["id"] == "Q1")
        self.assertEqual(transistor["region"], "active")
        self.assertAlmostEqual(transistor["vbe"], 0.7, places=9)
        self.assertAlmostEqual(transistor["vce"], 2.0, places=9)
        self.assertAlmostEqual(transistor["baseCurrent"], 1e-4, places=12)
        self.assertAlmostEqual(transistor["collectorCurrent"], 0.01, places=10)
        self.assertAlmostEqual(transistor["emitterCurrent"], 0.0101, places=10)

    def test_cutoff_when_base_is_below_threshold(self):
        response = SimulationService().simulate(world_source(), instances(vbb=0.5))
        transistor = next(item for item in response.components if item["id"] == "Q1")
        self.assertEqual(transistor["region"], "cutoff")
        self.assertAlmostEqual(transistor["baseCurrent"], 0.0, places=12)
        self.assertAlmostEqual(transistor["collectorCurrent"], 0.0, places=12)
        self.assertAlmostEqual(transistor["vce"], 12.0, places=9)

    def test_saturation_when_collector_supply_is_limited(self):
        response = SimulationService().simulate(world_source(), instances(vbb=3.0, vcc=5.0))
        transistor = next(item for item in response.components if item["id"] == "Q1")
        self.assertEqual(transistor["region"], "saturation")
        self.assertAlmostEqual(transistor["vbe"], 0.7, places=9)
        self.assertAlmostEqual(transistor["vce"], 0.2, places=9)
        self.assertGreater(transistor["collectorCurrent"], 0.0)
        self.assertGreater(transistor["baseCurrent"], 0.0)

    def test_parameter_sweep_recomputes_transistor_region(self):
        response = SimulationService().simulate(
            world_source(),
            instances(vbb=0.5),
            simulation={"analysis": "dc_sweep", "settings": {"source": "VBB", "parameter": "V", "start": 0.5, "stop": 1.9, "step": 0.2}},
        )
        self.assertEqual(response.status, "completed")
        components = response.result.dataset("components").values
        currents = [next(item for item in row if item["id"] == "Q1")["collectorCurrent"] for row in components]
        self.assertEqual(currents[0], 0.0)
        self.assertGreater(currents[-1], 0.0)

    def test_ac_reports_clear_small_signal_limitation(self):
        with self.assertRaisesRegex(Exception, "small-signal"):
            SimulationService().simulate(world_source(), instances(), simulation={"analysis": "ac", "settings": {"frequency": 1000}})


if __name__ == "__main__":
    unittest.main()
