import unittest

from worlds.simulation import SimulationService


def world_source():
    with open("examples/electronics.vdl") as file:
        return file.read()


def nmos_instances(vin=5.0):
    return [
        {"id": "VCC", "name": "VCC", "type": "VoltageSource", "parameters": {"V": 12.0}, "ports": {"p": "supply", "n": "ground"}},
        {"id": "RLOAD", "name": "Load resistor", "type": "Resistor", "parameters": {"R": 1000.0}, "ports": {"p": "supply", "n": "drain"}},
        {"id": "VIN", "name": "VIN", "type": "VoltageSource", "parameters": {"V": vin}, "ports": {"p": "gate", "n": "ground"}},
        {"id": "Q1", "name": "Q1", "type": "NMOS", "parameters": {"Vth": 1.0, "RdsOn": 10.0}, "ports": {"g": "gate", "d": "drain", "s": "ground"}},
    ]


def pmos_instances(vin=0.0):
    return [
        {"id": "VCC", "name": "VCC", "type": "VoltageSource", "parameters": {"V": 12.0}, "ports": {"p": "supply", "n": "ground"}},
        {"id": "RLOAD", "name": "Load resistor", "type": "Resistor", "parameters": {"R": 1000.0}, "ports": {"p": "drain", "n": "ground"}},
        {"id": "VIN", "name": "VIN", "type": "VoltageSource", "parameters": {"V": vin}, "ports": {"p": "gate", "n": "ground"}},
        {"id": "Q1", "name": "Q1", "type": "PMOS", "parameters": {"Vth": 1.0, "RdsOn": 10.0}, "ports": {"g": "gate", "d": "drain", "s": "supply"}},
    ]


def cmos_instances(vin=0.0):
    return [
        {"id": "VDD", "name": "VDD", "type": "VoltageSource", "parameters": {"V": 5.0}, "ports": {"p": "supply", "n": "ground"}},
        {"id": "VIN", "name": "VIN", "type": "VoltageSource", "parameters": {"V": vin}, "ports": {"p": "input", "n": "ground"}},
        {"id": "QP", "name": "PMOS 1", "type": "PMOS", "parameters": {"Vth": 1.0, "RdsOn": 10.0}, "ports": {"g": "input", "d": "output", "s": "supply"}},
        {"id": "QN", "name": "NMOS 1", "type": "NMOS", "parameters": {"Vth": 1.0, "RdsOn": 10.0}, "ports": {"g": "input", "d": "output", "s": "ground"}},
    ]


class MOSFETSimulationTest(unittest.TestCase):
    def test_nmos_turns_on_above_threshold(self):
        response = SimulationService().simulate(world_source(), nmos_instances())
        mosfet = next(item for item in response.components if item["id"] == "Q1")
        self.assertEqual(mosfet["region"], "on")
        self.assertAlmostEqual(mosfet["vgs"], 5.0, places=9)
        self.assertAlmostEqual(mosfet["vds"], 12.0 * 10.0 / 1010.0, places=9)
        self.assertGreater(mosfet["drainCurrent"], 0.0)
        self.assertAlmostEqual(mosfet["gateCurrent"], 0.0, places=12)

    def test_nmos_turns_off_below_threshold(self):
        response = SimulationService().simulate(world_source(), nmos_instances(vin=0.0))
        mosfet = next(item for item in response.components if item["id"] == "Q1")
        self.assertEqual(mosfet["region"], "off")
        self.assertAlmostEqual(mosfet["drainCurrent"], 0.0, places=12)
        self.assertAlmostEqual(mosfet["vds"], 12.0, places=9)

    def test_pmos_turns_on_when_gate_is_low(self):
        response = SimulationService().simulate(world_source(), pmos_instances(vin=0.0))
        mosfet = next(item for item in response.components if item["id"] == "Q1")
        self.assertEqual(mosfet["region"], "on")
        self.assertAlmostEqual(mosfet["vsg"], 12.0, places=9)
        self.assertAlmostEqual(mosfet["vsd"], 12.0 * 10.0 / 1010.0, places=9)
        self.assertGreater(mosfet["sourceToDrainCurrent"], 0.0)

    def test_pmos_turns_off_when_gate_is_high(self):
        response = SimulationService().simulate(world_source(), pmos_instances(vin=12.0))
        mosfet = next(item for item in response.components if item["id"] == "Q1")
        self.assertEqual(mosfet["region"], "off")
        self.assertAlmostEqual(mosfet["sourceToDrainCurrent"], 0.0, places=12)
        self.assertAlmostEqual(mosfet["vsd"], 12.0, places=9)

    def test_cmos_inverter_has_complementary_states(self):
        low = SimulationService().simulate(world_source(), cmos_instances(vin=0.0))
        high = SimulationService().simulate(world_source(), cmos_instances(vin=5.0))
        low_p = next(item for item in low.components if item["id"] == "QP")
        low_n = next(item for item in low.components if item["id"] == "QN")
        high_p = next(item for item in high.components if item["id"] == "QP")
        high_n = next(item for item in high.components if item["id"] == "QN")
        self.assertEqual(low_p["region"], "on")
        self.assertEqual(low_n["region"], "off")
        self.assertAlmostEqual(low.node_voltages["output"], 5.0 * 1000.0 / 1010.0, places=9)
        self.assertEqual(high_p["region"], "off")
        self.assertEqual(high_n["region"], "on")
        self.assertAlmostEqual(high.node_voltages["output"], 0.0, places=9)

    def test_ac_reports_semiconductor_small_signal_limitation(self):
        with self.assertRaisesRegex(Exception, "small-signal"):
            SimulationService().simulate(world_source(), nmos_instances(), simulation={"analysis": "ac", "settings": {"frequency": 1000}})
