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
    """Generic result envelope shared by all simulation analysis types.

    The model deliberately keeps datasets analysis-neutral so future analyses
    such as DC sweep and transient analysis can add multidimensional data
    without changing the top-level response contract.
    """

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
            metadata={
                "status": status,
            },
            datasets=(
                SimulationDataset(
                    name="node_voltages",
                    values=dict(node_voltages),
                ),
                SimulationDataset(
                    name="branch_currents",
                    values=dict(branch_currents),
                ),
                SimulationDataset(
                    name="components",
                    values=list(components),
                ),
            ),
            statistics={},
            analysis_information={
                "analysis": analysis,
                "settings": dict(settings),
                "outputs": list(outputs),
            },
        )
