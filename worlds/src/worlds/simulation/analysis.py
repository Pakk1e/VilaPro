from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Protocol

from worlds.math import Variable

from .model import SimulationModel
from .network import build_network_equation_system
from .solver import BranchCurrent, SimulationResult, SimulationSolver


DC_OPERATING_POINT = "dc_operating_point"
SUPPORTED_ANALYSES = (DC_OPERATING_POINT,)


class SimulationAnalysisError(ValueError):
    """Raised when a simulation analysis configuration is invalid."""


@dataclass(frozen=True)
class SimulationConfiguration:
    """Validated configuration describing one simulation run."""

    analysis: str = DC_OPERATING_POINT
    settings: Mapping[str, object] = field(default_factory=dict)
    outputs: tuple[str, ...] = ()

    @classmethod
    def from_dict(cls, value: Mapping[str, object] | None) -> "SimulationConfiguration":
        if value is None:
            return cls()
        if not isinstance(value, Mapping):
            raise SimulationAnalysisError("simulation must be an object")

        analysis = value.get("analysis", DC_OPERATING_POINT)
        if not isinstance(analysis, str) or not analysis:
            raise SimulationAnalysisError("simulation.analysis must be a non-empty string")
        if analysis not in SUPPORTED_ANALYSES:
            supported = ", ".join(SUPPORTED_ANALYSES)
            raise SimulationAnalysisError(
                f"Unsupported simulation analysis '{analysis}'. Supported analyses: {supported}"
            )

        settings = value.get("settings", {})
        if settings is None:
            settings = {}
        if not isinstance(settings, Mapping):
            raise SimulationAnalysisError("simulation.settings must be an object")

        outputs = value.get("outputs", [])
        if outputs is None:
            outputs = []
        if not isinstance(outputs, list) or not all(isinstance(item, str) for item in outputs):
            raise SimulationAnalysisError("simulation.outputs must be a list of strings")

        return cls(
            analysis=analysis,
            settings=dict(settings),
            outputs=tuple(outputs),
        )

    def to_dict(self) -> dict[str, object]:
        return {
            "analysis": self.analysis,
            "settings": dict(self.settings),
            "outputs": list(self.outputs),
        }


class SimulationAnalysis(Protocol):
    key: str

    def run(
        self,
        model: SimulationModel,
        *,
        known: dict[object, float] | None = None,
    ) -> SimulationResult:
        ...


class DCOperatingPointAnalysis:
    key = DC_OPERATING_POINT

    def run(
        self,
        model: SimulationModel,
        *,
        known: dict[object, float] | None = None,
    ) -> SimulationResult:
        equation_system = build_network_equation_system(model)
        solved = SimulationSolver().solve(equation_system, known=known)
        return SimulationResult(
            values=solved.values,
            instances={component.name: component for component in model.components},
        )


_ANALYSES: dict[str, SimulationAnalysis] = {
    DC_OPERATING_POINT: DCOperatingPointAnalysis(),
}


def get_simulation_analysis(analysis: str) -> SimulationAnalysis:
    try:
        return _ANALYSES[analysis]
    except KeyError as exc:
        supported = ", ".join(SUPPORTED_ANALYSES)
        raise SimulationAnalysisError(
            f"Unsupported simulation analysis '{analysis}'. Supported analyses: {supported}"
        ) from exc
