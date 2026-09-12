import unittest

from worlds.simulation import SimulationService


def world_source():
    with open("examples/electronics.vdl") as file:
        return file.read()


def instances(source_voltage):
    return [
        {"id": "V1", "name": "Input", "type": "VoltageSource", "parameters": {"V": source_voltage}, "ports": {"p": "node_in", "n": "ground"}},
        {"id": "R1", "name": "Limiter", "type": "Resistor", "parameters": {"R": 1000.0}, "ports": {"p": "node_in", "n": "node_diode"}},
        {"id": "D1", "name": "D1", "type": "Diode", "parameters": {"Vf": 0.7, "Ron": 1.0}, "ports": {"p": "node_diode", "n": "ground"}},
    ]


class DiodeSimulationTest(unittest.TestCase):
    def test_forward_biased_diode_turns_on(self):
        response = SimulationService().simulate(world_source(), instances(5.0))
        diode = next(item for item in response.components if item["id"] == "D1")
        self.assertAlmostEqual(diode["voltage"], 0.7, places=9)
        self.assertAlmostEqual(diode["current"], 4.295704295704296e-3, places=9)

    def test_reverse_biased_diode_blocks_current(self):
        response = SimulationService().simulate(world_source(), instances(-5.0))
        diode = next(item for item in response.components if item["id"] == "D1")
        self.assertAlmostEqual(diode["current"], 0.0, places=12)
        self.assertAlmostEqual(diode["voltage"], -5.0, places=9)

    def test_diode_dc_sweep_crosses_forward_threshold(self):
        response = SimulationService().simulate(
            world_source(),
            instances(0.0),
            simulation={"analysis": "dc_sweep", "settings": {"source": "V1", "parameter": "V", "start": 0.0, "stop": 2.0, "step": 0.1}},
        )
        components = response.result.dataset("components").values
        currents = []
        for row in components:
            diode = next(item for item in row if item["id"] == "D1")
            currents.append(diode["current"])
        self.assertAlmostEqual(currents[0], 0.0, places=12)
        self.assertAlmostEqual(currents[6], 0.0, places=12)
        self.assertGreater(currents[8], 1e-4)
        self.assertGreater(currents[-1], currents[8])


if __name__ == "__main__":
    unittest.main()
