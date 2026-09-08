from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping

@dataclass(frozen=True)
class SimulationDataset:
    name: str
    values: object
    dimensions: tuple[str, ...] = ()
    def to_dict(self): return {"name": self.name, "values": self.values, "dimensions": list(self.dimensions)}

@dataclass(frozen=True)
class SimulationResultModel:
    metadata: Mapping[str, object] = field(default_factory=dict)
    datasets: tuple[SimulationDataset, ...] = ()
    statistics: Mapping[str, object] = field(default_factory=dict)
    analysis_information: Mapping[str, object] = field(default_factory=dict)
    circuit_context: Mapping[str, object] = field(default_factory=dict)
    def to_dict(self): return {"metadata":dict(self.metadata),"datasets":[d.to_dict() for d in self.datasets],"statistics":dict(self.statistics),"analysis_information":dict(self.analysis_information),"circuit_context":dict(self.circuit_context)}
    @classmethod
    def from_dc_operating_point(cls, *, analysis, status, settings, outputs, node_voltages, branch_currents, components, circuit_context=None):
        return cls(metadata={"status":status},datasets=(SimulationDataset("node_voltages",dict(node_voltages)),SimulationDataset("branch_currents",dict(branch_currents)),SimulationDataset("components",list(components))),analysis_information={"analysis":analysis,"settings":dict(settings),"outputs":list(outputs)},circuit_context=dict(circuit_context or {}))
    @classmethod
    def from_dc_sweep(cls, *, status, settings, outputs, sweep_source, sweep_parameter, points, point_statuses, node_voltages, branch_currents, components, circuit_context=None):
        failed=sum(1 for item in point_statuses if item.get("status")=="failed")
        return cls(metadata={"status":status},datasets=(SimulationDataset("sweep",points,("sweep",)),SimulationDataset("sweep_status",point_statuses,("sweep",)),SimulationDataset("node_voltages",node_voltages,("sweep","node")),SimulationDataset("branch_currents",branch_currents,("sweep","branch")),SimulationDataset("components",components,("sweep","component"))),statistics={"point_count":len(points),"completed_point_count":len(points)-failed,"failed_point_count":failed},analysis_information={"analysis":"dc_sweep","settings":dict(settings),"outputs":list(outputs),"sweep":{"source":sweep_source,"parameter":sweep_parameter}},circuit_context=dict(circuit_context or {}))
    @classmethod
    def from_transient(cls, *, status, settings, outputs, points, point_statuses, node_voltages, branch_currents, components, circuit_context=None):
        failed=sum(1 for item in point_statuses if item.get("status")=="failed")
        return cls(metadata={"status":status},datasets=(SimulationDataset("time",points,("time",)),SimulationDataset("time_status",point_statuses,("time",)),SimulationDataset("node_voltages",node_voltages,("time","node")),SimulationDataset("branch_currents",branch_currents,("time","branch")),SimulationDataset("components",components,("time","component"))),statistics={"point_count":len(points),"completed_point_count":len(points)-failed,"failed_point_count":failed},analysis_information={"analysis":"transient","settings":dict(settings),"outputs":list(outputs)},circuit_context=dict(circuit_context or {}))
