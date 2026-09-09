from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping


@dataclass(frozen=True)
class SimulationDataset:
    """Named result dataset with optional dimensional metadata."""

    name: str
    values: object
    dimensions: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, object]:
        return {"name": self.name, "values": self.values, "dimensions": list(self.dimensions)}


@dataclass(frozen=True)
class SimulationResultModel:
    """Generic result envelope shared by all simulation analysis types."""

    metadata: Mapping[str, object] = field(default_factory=dict)
    datasets: tuple[SimulationDataset, ...] = ()
    statistics: Mapping[str, object] = field(default_factory=dict)
    analysis_information: Mapping[str, object] = field(default_factory=dict)
    circuit_context: Mapping[str, object] = field(default_factory=dict)

    @property
    def dataset_names(self) -> tuple[str, ...]:
        """Return dataset names in their stored order."""
        return tuple(dataset.name for dataset in self.datasets)

    def dataset(self, name: str) -> SimulationDataset:
        """Return a named dataset or raise ``KeyError`` if it is absent."""
        for dataset in self.datasets:
            if dataset.name == name:
                return dataset
        raise KeyError(f"Unknown simulation dataset '{name}'")

    def series(self, dataset_name: str, key: str) -> tuple[object | None, ...]:
        """Extract one named series from a time/sweep dataset.

        The dataset must contain a sequence of mapping rows. Missing values are
        represented by ``None`` so failed analysis points remain aligned with
        the independent-variable dataset.
        """
        dataset = self.dataset(dataset_name)
        if not dataset.values or not isinstance(dataset.values, (list, tuple)):
            raise ValueError(f"Simulation dataset '{dataset_name}' does not contain row data")
        values: list[object | None] = []
        for row in dataset.values:
            if row is None:
                values.append(None)
            elif isinstance(row, Mapping):
                values.append(row.get(key))
            else:
                raise ValueError(f"Simulation dataset '{dataset_name}' contains a non-mapping row")
        return tuple(values)

    def to_dict(self) -> dict[str, object]:
        return {
            "metadata": dict(self.metadata),
            "datasets": [dataset.to_dict() for dataset in self.datasets],
            "statistics": dict(self.statistics),
            "analysis_information": dict(self.analysis_information),
            "circuit_context": dict(self.circuit_context),
        }

    @classmethod
    def from_dc_operating_point(cls, *, analysis: str, status: str, settings: Mapping[str, object], outputs: tuple[str, ...], node_voltages: Mapping[str, float], branch_currents: Mapping[str, float], components: list[dict], circuit_context: Mapping[str, object] | None = None) -> "SimulationResultModel":
        return cls(
            metadata={"status": status},
            datasets=(SimulationDataset("node_voltages", dict(node_voltages)), SimulationDataset("branch_currents", dict(branch_currents)), SimulationDataset("components", list(components))),
            statistics={},
            analysis_information={"analysis": analysis, "settings": dict(settings), "outputs": list(outputs)},
            circuit_context=dict(circuit_context or {}),
        )

    @classmethod
    def from_dc_sweep(cls, *, status: str, settings: Mapping[str, object], outputs: tuple[str, ...], sweep_source: str, sweep_parameter: str, points: list[float], point_statuses: list[dict[str, object]], node_voltages: list[dict[str, float] | None], branch_currents: list[dict[str, float] | None], components: list[list[dict] | None], circuit_context: Mapping[str, object] | None = None) -> "SimulationResultModel":
        failed_count = sum(1 for item in point_statuses if item.get("status") == "failed")
        return cls(
            metadata={"status": status},
            datasets=(SimulationDataset("sweep", points, ("sweep",)), SimulationDataset("sweep_status", point_statuses, ("sweep",)), SimulationDataset("node_voltages", node_voltages, ("sweep", "node")), SimulationDataset("branch_currents", branch_currents, ("sweep", "branch")), SimulationDataset("components", components, ("sweep", "component"))),
            statistics={"point_count": len(points), "completed_point_count": len(point_statuses) - failed_count, "failed_point_count": failed_count},
            analysis_information={"analysis": "dc_sweep", "settings": dict(settings), "outputs": list(outputs), "sweep": {"source": sweep_source, "parameter": sweep_parameter}},
            circuit_context=dict(circuit_context or {}),
        )

    @classmethod
    def from_transient(cls, *, status: str, settings: Mapping[str, object], outputs: tuple[str, ...], points: list[float], point_statuses: list[dict[str, object]], node_voltages: list[dict[str, float] | None], branch_currents: list[dict[str, float] | None], components: list[list[dict] | None], circuit_context: Mapping[str, object] | None = None) -> "SimulationResultModel":
        failed_count = sum(1 for item in point_statuses if item.get("status") == "failed")
        return cls(
            metadata={"status": status},
            datasets=(SimulationDataset("time", points, ("time",)), SimulationDataset("time_status", point_statuses, ("time",)), SimulationDataset("node_voltages", node_voltages, ("time", "node")), SimulationDataset("branch_currents", branch_currents, ("time", "branch")), SimulationDataset("components", components, ("time", "component"))),
            statistics={"point_count": len(points), "completed_point_count": len(point_statuses) - failed_count, "failed_point_count": failed_count},
            analysis_information={"analysis": "transient", "settings": dict(settings), "outputs": list(outputs)},
            circuit_context=dict(circuit_context or {}),
        )
