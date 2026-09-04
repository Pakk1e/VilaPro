import unittest

from worlds.vdl import Parser
from worlds.simulation import simulate


class SimulationTest(unittest.TestCase):

    def test_two_resistor_voltage_divider(self):
        with open("examples/electronics.vdl") as f:
            world = Parser(f.read()).parse()

        result = simulate(
            world,
            instances=[
                {
                    "type": "VoltageSource",
                    "parameters": {"V": 10.0},
                    "ports": {
                        "p": "node_1",
                        "n": "ground",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 100.0},
                    "ports": {
                        "p": "node_1",
                        "n": "node_2",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 200.0},
                    "ports": {
                        "p": "node_2",
                        "n": "ground",
                    },
                },
            ],
        )

        values = result.values

        node_1 = next(
            value
            for unknown, value in values.items()
            if getattr(unknown, "name", None) == "V_node_1"
        )

        node_2 = next(
            value
            for unknown, value in values.items()
            if getattr(unknown, "name", None) == "V_node_2"
        )

        self.assertAlmostEqual(node_1, 10.0, places=12)
        self.assertAlmostEqual(node_2, 20.0 / 3.0, places=12)

    def test_voltage_divider_current(self):
        with open("examples/electronics.vdl") as f:
            world = Parser(f.read()).parse()

        result = simulate(
            world,
            instances=[
                {
                    "type": "VoltageSource",
                    "parameters": {"V": 10.0},
                    "ports": {
                        "p": "node_1",
                        "n": "ground",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 100.0},
                    "ports": {
                        "p": "node_1",
                        "n": "node_2",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 200.0},
                    "ports": {
                        "p": "node_2",
                        "n": "ground",
                    },
                },
            ],
        )

        current = next(
            value
            for unknown, value in result.values.items()
            if (
                getattr(unknown, "name", None) == "current"
                and [
                    getattr(argument, "name", None)
                    for argument in unknown.arguments
                ] == ["node_1", "node_2"]
            )
        )

        self.assertAlmostEqual(current, 1.0 / 30.0, places=12)


    def test_simulation_requires_ground(self):
        with open("examples/electronics.vdl") as f:
            world = Parser(f.read()).parse()

        with self.assertRaises(Exception) as context:
            simulate(
                world,
                instances=[
                    {
                        "type": "Resistor",
                        "parameters": {"R": 100.0},
                        "ports": {
                            "p": "node_1",
                            "n": "node_2",
                        },
                    },
                ],
            )

        self.assertIn(
            "NO_GROUND",
            str(context.exception),
        )


    def test_simulation_rejects_empty_port_connection(self):
        with open("examples/electronics.vdl") as f:
            world = Parser(f.read()).parse()

        with self.assertRaises(Exception) as context:
            simulate(
                world,
                instances=[
                    {
                        "type": "Resistor",
                        "parameters": {"R": 100.0},
                        "ports": {
                            "p": "node_1",
                            "n": "",
                        },
                    },
                ],
            )

        self.assertIn(
            "EMPTY_NODE",
            str(context.exception),
        )

    def test_result_exposes_node_voltages(self):
        with open("examples/electronics.vdl") as f:
            world = Parser(f.read()).parse()

        result = simulate(
            world,
            instances=[
                {
                    "type": "VoltageSource",
                    "parameters": {"V": 10.0},
                    "ports": {
                        "p": "node_1",
                        "n": "ground",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 100.0},
                    "ports": {
                        "p": "node_1",
                        "n": "node_2",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 200.0},
                    "ports": {
                        "p": "node_2",
                        "n": "ground",
                    },
                },
            ],
        )

        self.assertAlmostEqual(
            result.node_voltage("node_1"),
            10.0,
            places=12,
        )

        self.assertAlmostEqual(
            result.node_voltage("node_2"),
            20.0 / 3.0,
            places=12,
        )

        self.assertAlmostEqual(
            result.node_voltage("ground"),
            0.0,
            places=12,
        )

        self.assertEqual(
            result.node_voltages["ground"],
            0.0,
        )


    def test_result_exposes_branch_currents(self):
        with open("examples/electronics.vdl") as f:
            world = Parser(f.read()).parse()

        result = simulate(
            world,
            instances=[
                {
                    "type": "VoltageSource",
                    "parameters": {"V": 10.0},
                    "ports": {
                        "p": "node_1",
                        "n": "ground",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 100.0},
                    "ports": {
                        "p": "node_1",
                        "n": "node_2",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 200.0},
                    "ports": {
                        "p": "node_2",
                        "n": "ground",
                    },
                },
            ],
        )

        current = result.branch_current(
            "node_1",
            "node_2",
        )

        self.assertAlmostEqual(
            current,
            1.0 / 30.0,
            places=12,
        )

        self.assertAlmostEqual(
            result.branch_current(
                "node_2",
                "ground",
            ),
            1.0 / 30.0,
            places=12,
        )

    def test_circuit_result_exposes_instances(self):
        from worlds.simulation import SimulationCircuit

        with open("examples/electronics.vdl") as f:
            world = Parser(f.read()).parse()

        circuit = SimulationCircuit(world)

        circuit.add(
            "V1",
            "VoltageSource",
            parameters={"V": 10.0},
            ports={
                "p": "node_1",
                "n": "ground",
            },
        )

        circuit.add(
            "R1",
            "Resistor",
            parameters={"R": 100.0},
            ports={
                "p": "node_1",
                "n": "node_2",
            },
        )

        circuit.add(
            "R2",
            "Resistor",
            parameters={"R": 200.0},
            ports={
                "p": "node_2",
                "n": "ground",
            },
        )

        result = circuit.solve()

        self.assertIsNotNone(result.instance("V1"))
        self.assertIsNotNone(result.instance("R1"))
        self.assertIsNotNone(result.instance("R2"))


    def test_instance_exposes_electrical_values(self):
        from worlds.simulation import SimulationCircuit

        with open("examples/electronics.vdl") as f:
            world = Parser(f.read()).parse()

        circuit = SimulationCircuit(world)

        circuit.add(
            "V1",
            "VoltageSource",
            parameters={"V": 10.0},
            ports={
                "p": "node_1",
                "n": "ground",
            },
        )

        circuit.add(
            "R1",
            "Resistor",
            parameters={"R": 100.0},
            ports={
                "p": "node_1",
                "n": "node_2",
            },
        )

        circuit.add(
            "R2",
            "Resistor",
            parameters={"R": 200.0},
            ports={
                "p": "node_2",
                "n": "ground",
            },
        )

        result = circuit.solve()

        r1 = result.instance("R1")
        r2 = result.instance("R2")

        self.assertAlmostEqual(
            r1.voltage(),
            10.0 / 3.0,
            places=12,
        )

        self.assertAlmostEqual(
            r1.current(),
            1.0 / 30.0,
            places=12,
        )

        self.assertAlmostEqual(
            r1.power(),
            1.0 / 9.0,
            places=12,
        )

        self.assertAlmostEqual(
            r2.voltage(),
            20.0 / 3.0,
            places=12,
        )

        self.assertAlmostEqual(
            r2.current(),
            1.0 / 30.0,
            places=12,
        )

        self.assertAlmostEqual(
            r2.power(),
            2.0 / 9.0,
            places=12,
        )

    def test_simulation_service_returns_frontend_data(self):
        from worlds.simulation import SimulationService

        with open("examples/electronics.vdl") as f:
            world_source = f.read()

        response = SimulationService().simulate(
            world_source,
            instances=[
                {
                    "type": "VoltageSource",
                    "parameters": {"V": 10.0},
                    "ports": {
                        "p": "node_1",
                        "n": "ground",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 100.0},
                    "ports": {
                        "p": "node_1",
                        "n": "node_2",
                    },
                },
                {
                    "type": "Resistor",
                    "parameters": {"R": 200.0},
                    "ports": {
                        "p": "node_2",
                        "n": "ground",
                    },
                },
            ],
        )

        self.assertAlmostEqual(
            response.node_voltages["node_1"],
            10.0,
            places=12,
        )

        self.assertAlmostEqual(
            response.node_voltages["node_2"],
            20.0 / 3.0,
            places=12,
        )

        self.assertAlmostEqual(
            response.node_voltages["ground"],
            0.0,
            places=12,
        )

        self.assertAlmostEqual(
            response.branch_currents["node_1->node_2"],
            1.0 / 30.0,
            places=12,
        )

    def test_simulation_service_rejects_invalid_model(self):
        from worlds.simulation import (
            SimulationService,
            SimulationServiceError,
        )

        with self.assertRaises(SimulationServiceError):
            SimulationService().simulate(
                "world Broken { }",
                instances=[],
            )


if __name__ == "__main__":
    unittest.main()
