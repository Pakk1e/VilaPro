from __future__ import annotations

from dataclasses import dataclass, field, replace
from decimal import Decimal, InvalidOperation
from typing import Mapping, Protocol

from worlds.math import Variable

from .model import SimulationModel
from .network import build_network_equation_system
from .session import SimulationSession
from .solver import BranchCurrent, SimulationResult, SimulationSolver, SolverError
from .transient import TransientAnalysis

DC_OPERATING_POINT = "dc_operating_point"
DC_SWEEP = "dc_sweep"
TRANSIENT = "transient"
SUPPORTED_ANALYSES = (DC_OPERATING_POINT, DC_SWEEP, TRANSIENT)
MAX_SWEEP_POINTS = 10_000

class SimulationAnalysisError(ValueError):
    """Raised when a simulation analysis configuration is invalid."""

@dataclass(frozen=True)
class SimulationConfiguration:
    analysis: str = DC_OPERATING_POINT
    settings: Mapping[str, object] = field(default_factory=dict)
    outputs: tuple[str, ...] = ()

    @classmethod
    def from_dict(cls, value: Mapping[str, object] | None):
        if value is None: return cls()
        if not isinstance(value, Mapping): raise SimulationAnalysisError("simulation must be an object")
        analysis = value.get("analysis", DC_OPERATING_POINT)
        if not isinstance(analysis, str) or not analysis: raise SimulationAnalysisError("simulation.analysis must be a non-empty string")
        if analysis not in SUPPORTED_ANALYSES: raise SimulationAnalysisError(f"Unsupported simulation analysis '{analysis}'. Supported analyses: {', '.join(SUPPORTED_ANALYSES)}")
        settings = value.get("settings", {}) or {}
        outputs = value.get("outputs", []) or []
        if not isinstance(settings, Mapping): raise SimulationAnalysisError("simulation.settings must be an object")
        if not isinstance(outputs, list) or not all(isinstance(item, str) for item in outputs): raise SimulationAnalysisError("simulation.outputs must be a list of strings")
        if analysis == DC_SWEEP: cls._validate_dc_sweep_settings(settings)
        if analysis == TRANSIENT:
            from .transient import parse_transient_settings
            parse_transient_settings(settings)
        return cls(analysis=analysis, settings=dict(settings), outputs=tuple(outputs))

    @staticmethod
    def _validate_dc_sweep_settings(settings):
        source_id = settings.get("source")
        if not isinstance(source_id, str) or not source_id: raise SimulationAnalysisError("dc_sweep.settings.source must be a non-empty string")
        parameter = settings.get("parameter")
        if parameter is not None and parameter not in ("V", "I"): raise SimulationAnalysisError("dc_sweep.settings.parameter must be 'V' for voltage sources or 'I' for current sources")
        for name in ("start", "stop", "step"): _parse_finite_decimal(settings.get(name), name)
        step = _parse_finite_decimal(settings.get("step"), "step")
        if step == 0: raise SimulationAnalysisError("dc_sweep.settings.step must not be zero")
        start, stop = _parse_finite_decimal(settings.get("start"), "start"), _parse_finite_decimal(settings.get("stop"), "stop")
        if start < stop and step < 0: raise SimulationAnalysisError("dc_sweep.settings.step must be positive when start is below stop")
        if start > stop and step > 0: raise SimulationAnalysisError("dc_sweep.settings.step must be negative when start is above stop")
        if _count_sweep_points(start, stop, step) > MAX_SWEEP_POINTS: raise SimulationAnalysisError(f"dc_sweep produces more than {MAX_SWEEP_POINTS} points")

    def to_dict(self): return {"analysis": self.analysis, "settings": dict(self.settings), "outputs": list(self.outputs)}

@dataclass(frozen=True)
class DCSweepResult:
    source_id: str
    parameter: str
    points: tuple[Decimal, ...]
    results: tuple[SimulationResult | None, ...]
    errors: tuple[str | None, ...]

class SimulationAnalysis(Protocol):
    key: str
    def run(self, model: SimulationModel, *, known=None, configuration=None, session=None) -> object: ...

class DCOperatingPointAnalysis:
    key = DC_OPERATING_POINT
    def run(self, model, *, known=None, configuration=None, session=None):
        solved = SimulationSolver().solve(build_network_equation_system(model), known=known)
        result = SimulationResult(values=solved.values, instances={c.name: c for c in model.components})
        if session is not None: session.record_point(result, time=0.0)
        return result

class DCSweepAnalysis:
    key = DC_SWEEP
    def run(self, model, *, known=None, configuration=None, session=None):
        if configuration is None: raise SimulationAnalysisError("dc_sweep requires a simulation configuration")
        source_id, parameter, start, stop, step = self._parse_settings(configuration.settings, model)
        points = _build_sweep_points(start, stop, step); base_known = dict(known or {}); results=[]; errors=[]
        for point in points:
            if session is not None and session.cancel_requested: session.cancel(); raise SimulationAnalysisError("simulation was cancelled")
            swept_model = _override_component_parameter(model, source_id=source_id, parameter=parameter, value=float(point))
            try: solved = SimulationSolver().solve(build_network_equation_system(swept_model), known=base_known)
            except SolverError as exc:
                message=str(exc) or "DC operating point did not converge"; results.append(None); errors.append(message)
                if session is not None: session.record_point({"status":"failed","error":message}, time=float(point))
                continue
            result=SimulationResult(values=solved.values, instances={c.name:c for c in swept_model.components}); results.append(result); errors.append(None)
            if session is not None: session.record_point(result, time=float(point))
        return DCSweepResult(source_id, parameter, tuple(points), tuple(results), tuple(errors))

    @staticmethod
    def _parse_settings(settings, model):
        source_id=settings.get("source")
        if not isinstance(source_id,str) or not source_id: raise SimulationAnalysisError("dc_sweep.settings.source must be a non-empty string")
        matches=[c for c in model.components if c.component_id==source_id]
        if not matches: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' does not exist in the circuit")
        if len(matches)>1: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' is not unique")
        source=matches[0]; parameter=settings.get("parameter"); expected={"VoltageSource":"V","CurrentSource":"I"}.get(source.component_type)
        if expected is None: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' is not an independent voltage or current source")
        if parameter is None: parameter=expected
        if parameter!=expected: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' must be swept using parameter '{expected}'")
        if parameter not in source.parameters: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' does not expose parameter '{parameter}'")
        return source_id,parameter,_parse_finite_decimal(settings.get("start"),"start"),_parse_finite_decimal(settings.get("stop"),"stop"),_parse_finite_decimal(settings.get("step"),"step")

def _parse_finite_decimal(value,name):
    if isinstance(value,bool) or value is None: raise SimulationAnalysisError(f"dc_sweep.settings.{name} must be a finite number")
    try: parsed=Decimal(str(value))
    except (InvalidOperation,ValueError): raise SimulationAnalysisError(f"dc_sweep.settings.{name} must be a finite number") from None
    if not parsed.is_finite(): raise SimulationAnalysisError(f"dc_sweep.settings.{name} must be a finite number")
    return parsed

def _count_sweep_points(start,stop,step):
    if start==stop:return 1
    distance,increment=abs(stop-start),abs(step); return int(distance/increment)+1+int(distance%increment!=0)

def _build_sweep_points(start,stop,step):
    points=[]; current=start
    if start==stop:return [start]
    while current<=stop if step>0 else current>=stop: points.append(current); current+=step
    return points

def _override_component_parameter(model,*,source_id,parameter,value):
    components=[]; found=False
    for component in model.components:
        if component.component_id!=source_id: components.append(component); continue
        components.append(replace(component,parameters={**component.parameters,parameter:value})); found=True
    if not found: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' does not exist in the circuit")
    return SimulationModel(components=components,nodes=set(model.nodes))

_ANALYSES={DC_OPERATING_POINT:DCOperatingPointAnalysis(),DC_SWEEP:DCSweepAnalysis(),TRANSIENT:TransientAnalysis()}

def get_simulation_analysis(key):
    try:return _ANALYSES[key]
    except KeyError: raise SimulationAnalysisError(f"Unsupported simulation analysis '{key}'. Supported analyses: {', '.join(SUPPORTED_ANALYSES)}") from None
