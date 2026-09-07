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
        return {
            "name": self.name,
            "values": self.values,
            "dimensions": list(self.dimensions),
        }


@dataclass(frozen=True)
class SimulationResultModel:
    """Generic result envelope shared by all simulation analysis types."""

    metadata: Mapping[str, object] = field(default_factory=dict)
    datasets: tuple[SimulationDataset, ...] = ()
    statistics: Mapping[str, object] = field(default_factory=dict)
    analysis_information: Mapping[str, object] = field(default_factory=dict)

    def to_dict(self) -> dict[str, object]:
        return {
            "metadata": dict(self.metadata),
            "datasets": [dataset.to_dict() for dataset in self.datasets],
            "statistics": dict(self.statistics),
            "analysis_information": dict(self.analysis_information),
        }

    @classmethod
    def from_dc_operating_point(
        cls,
        *,
        analysis: str,
        status: str,
        settings: Mapping[str, object],
        outputs: tuple[str, ...],
        node_voltages: Mapping[str, float],
        branch_currents: Mapping[str, float],
        components: list[dict],
    ) -> "SimulationResultModel":
        """Build the generic result envelope for a DC operating-point run."""

        return cls(
            metadata={"status": status},
            datasets=(
                SimulationDataset(name="node_voltages", values=dict(node_voltages)),
                SimulationDataset(name="branch_currents", values=dict(branch_currents)),
                SimulationDataset(name="components", values=list(components)),
            ),
            statistics={},
            analysis_information={
                "analysis": analysis,
                "settings": dict(settings),
                "outputs": list(outputs),
            },
        )

    @classmethod
    def from_dc_sweep(
        cls,
        *,
        status: str,
        settings: Mapping[str, object],
        outputs: tuple[str, ...],
        sweep_source: str,
        sweep_parameter: str,
        points: list[float],
        node_voltages: list[dict[str, float]],
        branch_currents: list[dict[str, float]],
        components: list[list[dict]],
    ) -> "SimulationResultModel":
        """Build the generic result envelope for a DC sweep."""

        return cls(
            metadata={"status": status},
            datasets=(
                SimulationDataset(name="sweep", values=points, dimensions=("sweep",)),
                SimulationDataset(name="node_voltages", values=node_voltages, dimensions=("sweep", "node")),
                SimulationDataset(name="branch_currents", values=branch_currents, dimensions=("sweep", "branch")),
                SimulationDataset(name="components", values=components, dimensions=("sweep", "component")),
            ),
            statistics={"point_count": len(points)},
            analysis_information={
                "analysis": "dc_sweep",
                "settings": dict(settings),
                "outputs": list(outputs),
                "sweep": {"source": sweep_source, "parameter": sweep_parameter},
            },
        )
