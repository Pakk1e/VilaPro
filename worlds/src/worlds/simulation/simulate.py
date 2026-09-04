from __future__ import annotations

from worlds.semantics.component import ComponentSemanticAnalyzer

from .builder import build_simulation_component
from .model import SimulationModel
from .network import build_network_equation_system
from .solver import SimulationResult, SimulationSolver
from .validation import SimulationValidator


class SimulationError(Exception):
    pass


def simulate(
    world,
    instances: list[dict],
    known: dict[object, float] | None = None,
) -> SimulationResult:
    """
    Build and solve a complete simulation from a parsed VDL World.

    Each instance must contain:

        {
            "type": "Resistor",
            "parameters": {"R": 100.0},
            "ports": {
                "p": "node_1",
                "n": "ground",
            },
        }

    The World is expected to have already been parsed.
    Semantic analysis is performed here so callers do not need
    to manually construct the semantic layer.
    """

    from worlds.semantics import WorldSemanticAnalyzer

    semantic = WorldSemanticAnalyzer(world).analyze()

    model = SimulationModel()
    type_counts = {}

    for instance in instances:
        component_name = instance["type"]

        type_counts[component_name] = (
            type_counts.get(component_name, 0) + 1
        )

        instance_name = (
            f"{component_name}_{type_counts[component_name]}"
        )

        component = semantic.component(
            component_name
        )

        analyzer = ComponentSemanticAnalyzer(
            component.component,
            semantic.types,
            semantic.functions,
        )

        simulation_component = build_simulation_component(
            analyzer,
            name=instance_name,
            parameters=instance.get(
                "parameters",
                {},
            ),
            ports=instance.get(
                "ports",
                {},
            ),
        )

        model.add_component(
            simulation_component
        )

    # Validate the complete runtime model before
    # generating equations or invoking the solver.
    SimulationValidator().validate(model)

    equation_system = build_network_equation_system(
        model
    )

    solver = SimulationSolver()

    return solver.solve(
        equation_system,
        known=known,
    )
