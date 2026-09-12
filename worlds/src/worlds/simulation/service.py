from __future__ import annotations

from dataclasses import dataclass
import re

from worlds.semantics.component import ComponentSemanticAnalyzer
from worlds.semantics import WorldSemanticAnalyzer
from worlds.simulation.ac import ACResult
from worlds.simulation.analysis import DCSweepResult, FrequencySweepResult, SimulationConfiguration, get_simulation_analysis
from worlds.simulation.analysis import TransientResult
from worlds.simulation.builder import build_simulation_component
from worlds.simulation.model import SimulationModel
from worlds.simulation.result import SimulationResultModel
from worlds.simulation.session import SimulationSession, SimulationSessionError
from worlds.simulation.solver import SimulationResult
from worlds.simulation.validation import SimulationValidator
from worlds.simulation.visualization import plot_to_visualization, plots_to_visualization
from worlds.vdl import Parser


class SimulationServiceError(Exception):
    pass


@dataclass(frozen=True)
class SimulationResponse:
    analysis: str
    status: str
    node_voltages: dict[str, float]
    branch_currents: dict[str, float]
    components: list[dict]
    result: SimulationResultModel

    def plot(self, *, plot_id: str = "simulation-result", title: str | None = None, series_ids: tuple[str, ...] | None = None) -> dict[str, object]:
        return plot_to_visualization(self.result.to_plot(plot_id=plot_id, title=title, series_ids=series_ids))

    def plots(self, *, plot_ids: tuple[str, ...] = ("voltage", "current")) -> dict[str, object]:
        from worlds.simulation.plot_presets import voltage_plot, current_plot
        builders = {"voltage": voltage_plot, "current": current_plot}
        plots = tuple(builders[plot_id](self.result, plot_id=plot_id) for plot_id in plot_ids)
        return plots_to_visualization(plots)


class SimulationService:
    """Public application-level interface to the simulation engine."""

    def simulate(self, world_source: str, instances: list[dict], known: dict[object, float] | None = None, simulation: dict | None = None) -> SimulationResponse:
        session: SimulationSession | None = None
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
                analyzer = ComponentSemanticAnalyzer(component.component, semantic.types, semantic.functions)
                simulation_component = build_simulation_component(analyzer, name=instance_name, display_name=display_name, component_id=component_id, parameters=instance.get("parameters", {}), ports=instance.get("ports", {}))
                model.add_component(simulation_component)
            SimulationValidator().validate(model)
            circuit_context = self._build_circuit_context(model)
            analysis = get_simulation_analysis(configuration.analysis)
            session = SimulationSession(total_points=self._expected_point_count(configuration))
            session.start()
            result = analysis.run(model, known=known, configuration=configuration, session=session)
            if isinstance(result, DCSweepResult):
                session.complete()
                return self._build_sweep_response(result, configuration, circuit_context)
            if isinstance(result, FrequencySweepResult):
                session.complete()
                return self._build_frequency_sweep_response(result, configuration, circuit_context, model)
            if isinstance(result, TransientResult):
                session.complete()
                return self._build_transient_response(result, configuration, circuit_context)
            if isinstance(result, ACResult):
                session.complete()
                return self._build_ac_response(result, configuration, circuit_context)
            if not isinstance(result, SimulationResult):
                raise SimulationServiceError(f"Unsupported simulation result from analysis '{configuration.analysis}'")
            response = self._build_response(result)
            session.complete()
            generic_result = SimulationResultModel.from_dc_operating_point(analysis=configuration.analysis, status="completed", settings=configuration.settings, outputs=configuration.outputs, node_voltages=response.node_voltages, branch_currents=response.branch_currents, components=response.components, circuit_context=circuit_context)
            return SimulationResponse(configuration.analysis, "completed", response.node_voltages, response.branch_currents, response.components, generic_result)
        except SimulationSessionError as exc:
            raise SimulationServiceError(str(exc)) from exc
        except Exception as exc:
            if isinstance(exc, SimulationServiceError): raise
            if session is not None and not session.is_terminal and str(exc): session.fail(str(exc))
            raise SimulationServiceError(str(exc)) from exc

    @staticmethod
    def _expected_point_count(configuration: SimulationConfiguration) -> int | None:
        if configuration.analysis in {"dc_sweep", "frequency_sweep"}:
            start, stop, step = configuration.settings["start"], configuration.settings["stop"], configuration.settings["step"]
            values = [float(start)]
            current, target, increment = float(start), float(stop), float(step)
            epsilon = abs(increment) * 1e-12 + 1e-15
            while True:
                next_value = current + increment
                if (increment > 0 and next_value > target + epsilon) or (increment < 0 and next_value < target - epsilon): break
                values.append(next_value); current = next_value
                if len(values) > 10_000: return None
            return len(values)
        if configuration.analysis == "transient":
            from worlds.simulation.transient import TransientConfiguration
            return len(TransientConfiguration.from_dict(configuration.settings).time_points())
        return 1

    def _build_sweep_response(self, sweep, configuration, circuit_context):
        point_responses = [self._build_response(result) if result is not None else None for result in sweep.results]
        successful_responses = [response for response in point_responses if response is not None]
        last = successful_responses[-1] if successful_responses else _LegacySimulationResponse({}, {}, [])
        point_statuses = [{"status": "completed"} if error is None else {"status": "failed", "error": error} for error in sweep.errors]
        result_status = "completed_with_failures" if any(item["status"] == "failed" for item in point_statuses) else "completed"
        generic_result = SimulationResultModel.from_dc_sweep(status=result_status, settings=configuration.settings, outputs=configuration.outputs, sweep_source=sweep.source_id, sweep_parameter=sweep.parameter, points=[float(point) for point in sweep.points], point_statuses=point_statuses, node_voltages=[item.node_voltages if item is not None else None for item in point_responses], branch_currents=[item.branch_currents if item is not None else None for item in point_responses], components=[item.components if item is not None else None for item in point_responses], circuit_context=circuit_context)
        return SimulationResponse(configuration.analysis, result_status, last.node_voltages, last.branch_currents, last.components, generic_result)

    def _build_frequency_sweep_response(self, sweep, configuration, circuit_context, model):
        point_responses = [self._build_ac_point_response(result, model) if result is not None else None for result in sweep.results]
        successful_responses = [response for response in point_responses if response is not None]
        last = successful_responses[-1] if successful_responses else _LegacySimulationResponse({}, {}, [])
        point_statuses = [{"status": "completed"} if error is None else {"status": "failed", "error": error} for error in sweep.errors]
        result_status = "completed_with_failures" if any(item["status"] == "failed" for item in point_statuses) else "completed"
        generic_result = SimulationResultModel.from_frequency_sweep(status=result_status, settings=configuration.settings, outputs=configuration.outputs, points=[float(point) for point in sweep.points], point_statuses=point_statuses, node_voltages=[item.node_voltages if item is not None else None for item in point_responses], branch_currents=[item.branch_currents if item is not None else None for item in point_responses], components=[item.components if item is not None else None for item in point_responses], circuit_context=circuit_context)
        return SimulationResponse(configuration.analysis, result_status, last.node_voltages, last.branch_currents, last.components, generic_result)

    @staticmethod
    def _build_ac_point_response(ac_result: ACResult, model):
        raw_values = {str(key): complex(value) for key, value in ac_result.values.items()}
        node_voltages = {}
        for key, value in raw_values.items():
            match = re.fullmatch(r"Variable\(name=['\"]V_(.+?)['\"]\)", key)
            if match: node_voltages[match.group(1)] = abs(value)
        branch_currents = {}
        component_currents = {}
        branch_pattern = re.compile(r"BranchCurrent\(name=['\"]current['\"], arguments=\(Variable\(name=['\"](.+?)['\"]\), Variable\(name=['\"](.+?)['\"]\)\), component=['\"](.+?)['\"]\)")
        for key, value in raw_values.items():
            match = branch_pattern.fullmatch(key)
            if not match: continue
            first_node, second_node, component_name = match.groups()
            branch_currents[f"{first_node}->{second_node}"] = abs(value)
            component_currents.setdefault(component_name, []).append((first_node, second_node, value))
        components = []
        for component in model.components:
            p_node, n_node = component.ports.get("p"), component.ports.get("n")
            if p_node is None or n_node is None: continue
            p_voltage = 0j if p_node == "ground" else next((value for key, value in raw_values.items() if key == f"Variable(name='V_{p_node}')"), None)
            n_voltage = 0j if n_node == "ground" else next((value for key, value in raw_values.items() if key == f"Variable(name='V_{n_node}')"), None)
            if p_voltage is None or n_voltage is None: continue
            current_matches = component_currents.get(component.name, [])
            current = next((value for first, second, value in current_matches if first == p_node and second == n_node), None)
            if current is None: current = next((-value for first, second, value in current_matches if first == n_node and second == p_node), None)
            components.append({"id": component.component_id, "name": component.display_name, "type": component.component_type, "voltage": abs(p_voltage - n_voltage), "current": abs(current) if current is not None else None})
        return _LegacySimulationResponse(node_voltages, branch_currents, components)

    def _build_transient_response(self, transient, configuration, circuit_context):
        point_responses = [self._build_response(result) if result is not None else None for result in transient.results]
        successful_responses = [response for response in point_responses if response is not None]
        last = successful_responses[-1] if successful_responses else _LegacySimulationResponse({}, {}, [])
        statuses = [{"status": "completed"} if error is None else {"status": "failed", "error": error} for error in transient.errors]
        status = "completed_with_failures" if any(item["status"] == "failed" for item in statuses) else "completed"
        generic_result = SimulationResultModel.from_transient(status=status, settings=configuration.settings, outputs=configuration.outputs, points=[float(point) for point in transient.points], point_statuses=statuses, node_voltages=[item.node_voltages if item is not None else None for item in point_responses], branch_currents=[item.branch_currents if item is not None else None for item in point_responses], components=[item.components if item is not None else None for item in point_responses], circuit_context=circuit_context)
        return SimulationResponse(configuration.analysis, status, last.node_voltages, last.branch_currents, last.components, generic_result)

    def _build_ac_response(self, ac_result: ACResult, configuration, circuit_context):
        generic_result = SimulationResultModel.from_ac(status="completed", settings=configuration.settings, outputs=configuration.outputs, frequency=ac_result.frequency, excitation=ac_result.excitation, phasors=ac_result.values, circuit_context=circuit_context)
        return SimulationResponse(configuration.analysis, "completed", {}, {}, [], generic_result)

    @staticmethod
    def _build_circuit_context(model):
        nodes={}; components=[]; branches=[]
        for component in model.components:
            port_context={}
            for port_id,node in component.ports.items():
                port_context[port_id]={"node":node,"label":port_id}
                if node is None: continue
                entry=nodes.setdefault(node,{"id":node,"label":"Ground" if node=="ground" else node.replace("_"," ").title(),"is_ground":node=="ground","connections":[]})
                entry["connections"].append({"instance_id":component.component_id,"instance_name":component.display_name,"component_type":component.component_type,"port_id":port_id,"port_label":port_id})
            components.append({"id":component.component_id,"name":component.display_name,"type":component.component_type,"ports":port_context})
            if "p" in component.ports and "n" in component.ports:
                branches.append({"id":component.component_id,"name":component.display_name,"type":component.component_type,"positive":{"port_id":"p","node":component.ports["p"]},"negative":{"port_id":"n","node":component.ports["n"]}})
        return {"nodes":list(nodes.values()),"components":components,"branches":branches}

    @staticmethod
    def _build_response(result):
        components=[]
        for name,component in result.instances.items():
            if component.component_type == "NPNTransistor":
                ports=component.ports
                base, collector, emitter = ports.get("b"), ports.get("c"), ports.get("e")
                if not base or not collector or not emitter: raise SimulationServiceError(f"NPN transistor '{component.display_name}' must have b/c/e ports")
                vbe=result.node_voltage(base)-result.node_voltage(emitter)
                vce=result.node_voltage(collector)-result.node_voltage(emitter)
                ib=result.component_current(name,base,emitter)
                ic=result.component_current(name,collector,emitter)
                ie=ib+ic
                beta=float(component.parameters.get("Beta",0.0))
                vbe_on=float(component.parameters.get("Vbe",0.0))
                vce_sat=float(component.parameters.get("VceSat",0.0))
                if ib <= 1e-12 or vbe < vbe_on-1e-9: region="cutoff"
                elif vce <= vce_sat+1e-9: region="saturation"
                else: region="active"
                components.append({"id":component.component_id,"name":component.display_name,"type":component.component_type,"voltage":vce,"current":ic,"power":vce*ic,"vbe":vbe,"vce":vce,"baseCurrent":ib,"collectorCurrent":ic,"emitterCurrent":ie,"beta":beta,"region":region})
                continue
            ports=component.ports
            if "p" not in ports or "n" not in ports: raise SimulationServiceError(f"Component '{component.display_name}' is not a two-terminal component")
            voltage=result.node_voltage(ports["p"])-result.node_voltage(ports["n"])
            current=result.component_current(name,ports["p"],ports["n"])
            components.append({"id":component.component_id,"name":component.display_name,"type":component.component_type,"voltage":voltage,"current":current,"power":voltage*current})
        branch_currents={f"{first_node}->{second_node}":value for (first_node,second_node),value in result.branch_currents.items()}
        return _LegacySimulationResponse(dict(result.node_voltages),branch_currents,components)


@dataclass(frozen=True)
class _LegacySimulationResponse:
    node_voltages: dict[str,float]
    branch_currents: dict[str,float]
    components: list[dict]
