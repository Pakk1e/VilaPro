from __future__ import annotations

from dataclasses import dataclass
from math import cos, pi, sin
from typing import Mapping

from worlds.math import Binary, Equation, FunctionCall, Number, Variable

from .model import SimulationModel
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
        if not all(value == value and abs(value) != float("inf") for value in (frequency, amplitude, phase)):
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
    source = next((component for component in model.components if component.component_type in {"VoltageSource", "CurrentSource"}), None)
    if source is None:
        raise ACConfigurationError("AC analysis requires an independent voltage or current source")
    source_parameter = "V" if source.component_type == "VoltageSource" else "I"
    if source_parameter not in source.parameters:
        raise ACConfigurationError(f"AC source '{source.component_id}' does not expose parameter '{source_parameter}'")

    omega = 2.0 * pi * configuration.frequency
    excitation = configuration.excitation
    components = []
    for component in model.components:
        if component.component_id == source.component_id:
            if source.component_type == "VoltageSource":
                equations = [Equation(FunctionCall("voltage", (Variable("p"), Variable("n"))), Number(excitation))]
            else:
                equations = [Equation(FunctionCall("current", (Variable("p"), Variable("n"))), Number(excitation))]
        elif component.component_type == "Capacitor":
            capacitance = float(component.parameters.get("C", 0.0))
            if capacitance <= 0:
                raise ACConfigurationError(f"Capacitor '{component.component_id}' must have C > 0")
            admittance = complex(0.0, omega * capacitance)
            equations = [Equation(FunctionCall("current", (Variable("p"), Variable("n"))), Binary(FunctionCall("voltage", (Variable("p"), Variable("n"))), "*", Number(admittance)))]
        elif component.component_type == "Inductor":
            inductance = float(component.parameters.get("L", 0.0))
            if inductance <= 0:
                raise ACConfigurationError(f"Inductor '{component.component_id}' must have L > 0")
            impedance = complex(0.0, omega * inductance)
            equations = [Equation(FunctionCall("voltage", (Variable("p"), Variable("n"))), Binary(FunctionCall("current", (Variable("p"), Variable("n"))), "*", Number(impedance)))]
        else:
            equations = list(component.equations)
        components.append(component.__class__(name=component.name, display_name=component.display_name, component_id=component.component_id, component_type=component.component_type, parameters=component.parameters, ports=component.ports, equations=equations))

    ac_model = SimulationModel(components=components, nodes=set(model.nodes))
    solved = SimulationSolver().solve(build_network_equation_system(ac_model), known={})
    values = {str(key): complex(value) for key, value in solved.values.items()}
    return ACResult(frequency=configuration.frequency, excitation=excitation, values=values, source_id=source.component_id, source_parameter=source_parameter)
