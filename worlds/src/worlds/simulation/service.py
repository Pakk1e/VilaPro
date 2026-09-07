from __future__ import annotations

from dataclasses import dataclass

from worlds.semantics.component import ComponentSemanticAnalyzer
from worlds.semantics import WorldSemanticAnalyzer
from worlds.simulation.analysis import (
    DCSweepResult,
    SimulationConfiguration,
    get_simulation_analysis,
)
from worlds.simulation.builder import build_simulation_component
from worlds.simulation.model import SimulationModel
from worlds.simulation.result import SimulationResultModel
from worlds.simulation.solver import BranchCurrent, SimulationResult
from worlds.simulation.validation import SimulationValidator
from worlds.vdl import Parser
from worlds.math import Variable


class SimulationServiceError(Exception):
    pass


@dataclass(frozen=True)
class SimulationResponse:
    """Application response with a generic result envelope and legacy fields."""

    analysis: str
    status: str
    node_voltages: dict[str, float]
    branch_currents: dict[str, float]
    components: list[dict]
    result: SimulationResultModel


class SimulationService:
    """Public application-level interface to the simulation engine."""

    def simulate(
        self,
        world_source: str,
        instances: list[dict],
        known: dict[object, float] | None = None,
        simulation: dict | None = None,
    ) -> SimulationResponse:
        try:
            configuration = SimulationConfiguration.from_dict(simulation)
            world = Parser(world_source).parse()
            semantic = WorldSemanticAnalyzer(world).analyze()
            model = SimulationModel()
            type_counts = {}

            for index, instance in enumerate(instances):
                component_name = instance["type"]
                type_counts[component_name] = type_counts.get(component_name, 0) + 1

                component_id = str(instance.get("id") or f"component-{index + 1}")
                display_name = str(instance.get("name") or component_id)
                instance_name = f"{component_name}_{type_counts[component_name]}"

                component = semantic.component(component_name)
                analyzer = ComponentSemanticAnalyzer(
                    component.component,
                    semantic.types,
                    semantic.functions,
                )

                simulation_component = build_simulation_component(
                    analyzer,
                    name=instance_name,
                    display_name=display_name,
                    component_id=component_id,
                    parameters=instance.get("parameters", {}),
                    ports=instance.get("ports", {}),
                )
                model.add_component(simulation_component)

            SimulationValidator().validate(model)

            analysis = get_simulation_analysis(configuration.analysis)
            result = analysis.run(
                model,
                known=known,
                configuration=configuration,
            )

            if isinstance(result, DCSweepResult):
                return self._build_sweep_response(result, configuration)

            if not isinstance(result, SimulationResult):
                raise SimulationServiceError(
                    f"Unsupported simulation result from analysis '{configuration.analysis}'"
                )

            response = self._build_response(result)
            generic_result = SimulationResultModel.from_dc_operating_point(
                analysis=configuration.analysis,
                status="completed",
                settings=configuration.settings,
                outputs=configuration.outputs,
                node_voltages=response.node_voltages,
                branch_currents=response.branch_currents,
                components=response.components,
            )

            return SimulationResponse(
                analysis=configuration.analysis,
                status="completed",
                node_voltages=response.node_voltages,
                branch_currents=response.branch_currents,
                components=response.components,
                result=generic_result,
            )

        except Exception as exc:
            if isinstance(exc, SimulationServiceError):
                raise
            raise SimulationServiceError(str(exc)) from exc

    def _build_sweep_response(
        self,
        sweep: DCSweepResult,
        configuration: SimulationConfiguration,
    ) -> SimulationResponse:
        if not sweep.results:
            raise SimulationServiceError("dc_sweep produced no simulation results")

        point_responses = [self._build_response(result) for result in sweep.results]
        last = point_responses[-1]
        generic_result = SimulationResultModel.from_dc_sweep(
            status="completed",
            settings=configuration.settings,
            outputs=configuration.outputs,
            sweep_source=sweep.source_id,
            sweep_parameter=sweep.parameter,
            points=[float(point) for point in sweep.points],
            node_voltages=[item.node_voltages for item in point_responses],
            branch_currents=[item.branch_currents for item in point_responses],
            components=[item.components for item in point_responses],
        )

        return SimulationResponse(
            analysis=configuration.analysis,
            status="completed",
            node_voltages=last.node_voltages,
            branch_currents=last.branch_currents,
            components=last.components,
            result=generic_result,
        )

    @staticmethod
    def _build_response(result: SimulationResult) -> "_LegacySimulationResponse":
        components = []

        for name, component in result.instances.items():
            ports = component.ports
            if "p" not in ports or "n" not in ports:
                raise SimulationServiceError(
                    f"Component '{component.display_name}' is not a two-terminal component"
                )

            voltage = result.node_voltage(ports["p"]) - result.node_voltage(ports["n"])
            current_unknown = BranchCurrent(
                name="current",
                arguments=(Variable(ports["p"]), Variable(ports["n"])),
                component=name,
            )
            current = result.value(current_unknown)

            components.append({
                "id": component.component_id,
                "name": component.display_name,
                "type": component.component_type,
                "voltage": voltage,
                "current": current,
                "power": voltage * current,
            })

        branch_currents = {
            f"{first_node}->{second_node}": value
            for (first_node, second_node), value in result.branch_currents.items()
        }

        return _LegacySimulationResponse(
            node_voltages=dict(result.node_voltages),
            branch_currents=branch_currents,
            components=components,
        )


@dataclass(frozen=True)
class _LegacySimulationResponse:
    """Internal legacy-shaped values used to assemble the generic response."""

    node_voltages: dict[str, float]
    branch_currents: dict[str, float]
    components: list[dict]
