from __future__ import annotations

from dataclasses import dataclass, field

from .model import SimulationComponent
from .builder import build_simulation_component
from .network import build_network_equation_system
from .solver import SimulationResult, SimulationSolver
from worlds.semantics.component import ComponentSemanticAnalyzer


class CircuitError(Exception):
    pass


@dataclass
class CircuitInstance:
    name: str
    component: SimulationComponent


@dataclass
class SimulationCircuit:
    world: object
    instances: list[CircuitInstance] = field(default_factory=list)

    def __post_init__(self):
        from worlds.semantics import WorldSemanticAnalyzer

        self.semantic = WorldSemanticAnalyzer(
            self.world
        ).analyze()

    def add(
        self,
        name: str,
        component_type: str,
        *,
        parameters: dict[str, float] | None = None,
        ports: dict[str, str] | None = None,
    ) -> CircuitInstance:

        if any(
            instance.name == name
            for instance in self.instances
        ):
            raise CircuitError(
                f"Duplicate circuit instance: {name}"
            )

        component = self.semantic.component(
            component_type
        )

        analyzer = ComponentSemanticAnalyzer(
            component.component,
            self.semantic.types,
            self.semantic.functions,
        )

        # The circuit API allows ports to remain unconnected
        # until connect() or ground() is called.
        supplied_ports = ports or {}

        expected_ports = {
            port.name
            for port in component.component.ports
        }

        unknown_ports = set(supplied_ports) - expected_ports

        if unknown_ports:
            raise CircuitError(
                f"Unknown ports for {component_type}: "
                f"{sorted(unknown_ports)}"
            )

        # Build with temporary unique node names. These nodes are
        # subsequently merged by connect() / ground().
        circuit_ports = dict(supplied_ports)

        for port_name in expected_ports:
            if port_name not in circuit_ports:
                circuit_ports[port_name] = None

        simulation_component = build_simulation_component(
            analyzer,
            parameters=parameters or {},
            ports=circuit_ports,
        )

        instance = CircuitInstance(
            name=name,
            component=simulation_component,
        )

        self.instances.append(instance)

        return instance

    def connect(
        self,
        first: str,
        second: str,
    ):
        """
        Connect two component ports.

        Ports use the form:

            "Instance.port"

        Example:

            circuit.connect("V1.p", "R1.p")
        """

        first_instance, first_port = self._parse_port(first)
        second_instance, second_port = self._parse_port(second)

        first_component = self._instance(first_instance)
        second_component = self._instance(second_instance)

        if first_port not in first_component.component.ports:
            raise CircuitError(
                f"Unknown port: {first}"
            )

        if second_port not in second_component.component.ports:
            raise CircuitError(
                f"Unknown port: {second}"
            )

        first_node = first_component.component.ports[first_port]
        second_node = second_component.component.ports[second_port]

        # If both ports are already connected to different nodes,
        # merge those nodes throughout the circuit.
        if first_node and second_node and first_node != second_node:
            self._merge_nodes(first_node, second_node)

        elif not first_node and second_node:
            first_component.component.ports[first_port] = second_node

        elif first_node and not second_node:
            second_component.component.ports[second_port] = first_node

        else:
            # Both are unassigned. Allocate a deterministic node name.
            node = self._new_node()
            first_component.component.ports[first_port] = node
            second_component.component.ports[second_port] = node

    def ground(self, port: str):
        """
        Connect a component port to ground.

        Example:

            circuit.ground("V1.n")
        """

        instance_name, port_name = self._parse_port(port)
        instance = self._instance(instance_name)

        if port_name not in instance.component.ports:
            raise CircuitError(
                f"Unknown port: {port}"
            )

        current_node = instance.component.ports[port_name]

        if current_node and current_node != "ground":
            self._merge_nodes(current_node, "ground")
        else:
            instance.component.ports[port_name] = "ground"

    def _parse_port(self, value: str):
        if not isinstance(value, str) or "." not in value:
            raise CircuitError(
                f"Invalid port reference: {value!r}"
            )

        instance, port = value.split(".", 1)

        if not instance or not port:
            raise CircuitError(
                f"Invalid port reference: {value!r}"
            )

        return instance, port

    def _instance(self, name: str):
        for instance in self.instances:
            if instance.name == name:
                return instance

        raise CircuitError(
            f"Unknown circuit instance: {name}"
        )

    def _new_node(self):
        used = {
            node
            for instance in self.instances
            for node in instance.component.ports.values()
            if node is not None
        }

        index = 1

        while f"node_{index}" in used:
            index += 1

        return f"node_{index}"

    def _merge_nodes(self, old: str, new: str):
        for instance in self.instances:
            for port, node in instance.component.ports.items():
                if node == old:
                    instance.component.ports[port] = new

    def solve(
        self,
        known: dict[object, float] | None = None,
    ) -> SimulationResult:

        from .model import SimulationModel

        model = SimulationModel()

        for instance in self.instances:
            model.add_component(
                instance.component
            )

        equation_system = build_network_equation_system(
            model
        )

        result = SimulationSolver().solve(
            equation_system,
            known=known,
        )

        return SimulationResult(
            values=result.values,
            instances={
                instance.name: instance.component
                for instance in self.instances
            },
        )
