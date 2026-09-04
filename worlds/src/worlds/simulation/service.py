from __future__ import annotations

from dataclasses import dataclass

from worlds.semantics.component import ComponentSemanticAnalyzer
from worlds.semantics import WorldSemanticAnalyzer
from worlds.simulation.builder import build_simulation_component
from worlds.simulation.model import SimulationModel
from worlds.simulation.network import build_network_equation_system
from worlds.simulation.solver import SimulationResult, SimulationSolver
from worlds.simulation.validation import SimulationValidator
from worlds.vdl import Parser


class SimulationServiceError(Exception):
    pass


@dataclass(frozen=True)
class SimulationResponse:
    node_voltages: dict[str, float]
    branch_currents: dict[str, float]


class SimulationService:
    """
    Public application-level interface to the simulation engine.

    This layer intentionally knows nothing about HTTP or any
    particular frontend framework.
    """

    def simulate(
        self,
        world_source: str,
        instances: list[dict],
        known: dict[object, float] | None = None,
    ) -> SimulationResponse:
        try:
            world = Parser(world_source).parse()

            semantic = WorldSemanticAnalyzer(
                world
            ).analyze()

            model = SimulationModel()

            for instance in instances:
                component_name = instance["type"]

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

            SimulationValidator().validate(model)

            equation_system = (
                build_network_equation_system(model)
            )

            result = SimulationSolver().solve(
                equation_system,
                known=known,
            )

            return self._build_response(result)

        except Exception as exc:
            if isinstance(exc, SimulationServiceError):
                raise

            raise SimulationServiceError(
                str(exc)
            ) from exc

    @staticmethod
    def _build_response(
        result: SimulationResult,
    ) -> SimulationResponse:
        node_voltages = dict(
            result.node_voltages
        )

        branch_currents = {
            f"{first_node}->{second_node}": value
            for (
                first_node,
                second_node
            ), value in result.branch_currents.items()
        }

        return SimulationResponse(
            node_voltages=node_voltages,
            branch_currents=branch_currents,
        )
