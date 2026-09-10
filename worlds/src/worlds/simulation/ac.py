from __future__ import annotations

from dataclasses import dataclass
from math import cos, pi, sin
from typing import Mapping

from dataclasses import replace

from .model import SimulationModel
from .solver import SimulationResult
from .network import build_network_equation_system
from .solver import SimulationSolver


class ACConfigurationError(ValueError):
    """Raised when AC excitation settings are invalid."""


@dataclass(frozen=True)
class ACConfiguration:
    frequency: float = 1_000.0
    amplitude: float = 1.0
    phase: float = 0.0

    @classmethod
    def from_dict(cls, settings: Mapping[str, object]) -> "ACConfiguration":
        try:
            frequency = float(settings.get("frequency", cls.frequency))
            amplitude = float(settings.get("amplitude", cls.amplitude))
            phase = float(settings.get("phase", cls.phase))
        except (TypeError, ValueError) as exc:
            raise ACConfigurationError("ac.settings.frequency, amplitude and phase must be numbers") from exc
        if not all(map(lambda value: value == value and abs(value) != float("inf"), (frequency, amplitude, phase))):
            raise ACConfigurationError("ac.settings.frequency, amplitude and phase must be finite")
        if frequency <= 0:
            raise ACConfigurationError("ac.settings.frequency must be greater than zero")
        if amplitude < 0:
            raise ACConfigurationError("ac.settings.amplitude must not be negative")
        return cls(frequency=frequency, amplitude=amplitude, phase=phase)

    @property
    def phase_radians(self) -> float:
        return self.phase * pi / 180.0

    @property
    def excitation(self) -> complex:
        return self.amplitude * complex(cos(self.phase_radians), sin(self.phase_radians))


@dataclass(frozen=True)
class ACResult:
    frequency: float
    excitation: complex
    values: Mapping[str, complex]
    source_id: str
    source_parameter: str


def solve_ac(model: SimulationModel, configuration: ACConfiguration) -> ACResult:
    """Solve the currently supported linear electrical network as phasors.

    The first AC increment intentionally reuses the existing real linear network
    solver to obtain the unit-excitation transfer response. Reactive component
    impedance models are added separately when AC-capable component
    representations are introduced.
    """
    source = next((component for component in model.components if component.component_type in {"VoltageSource", "CurrentSource"}), None)
    if source is None:
        raise ACConfigurationError("AC analysis requires an independent voltage or current source")
    parameter = "V" if source.component_type == "VoltageSource" else "I"
    if parameter not in source.parameters:
        raise ACConfigurationError(f"AC source '{source.component_id}' does not expose parameter '{parameter}'")

    unit_components = [
        replace(component, parameters={**component.parameters, parameter: 1.0})
        if component.component_id == source.component_id else component
        for component in model.components
    ]
    unit_model = SimulationModel(components=unit_components, nodes=set(model.nodes))
    solved = SimulationSolver().solve(build_network_equation_system(unit_model), known={})
    unit_result = SimulationResult(
        values=solved.values,
        instances={component.name: component for component in unit_model.components},
    )
    excitation = configuration.excitation
    values = {str(key): complex(value) * excitation for key, value in unit_result.values.items()}
    return ACResult(
        frequency=configuration.frequency,
        excitation=excitation,
        values=values,
        source_id=source.component_id,
        source_parameter=parameter,
    )
