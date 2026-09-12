from __future__ import annotations

from dataclasses import dataclass, field, replace
from decimal import Decimal, InvalidOperation
from typing import Mapping, Protocol

from worlds.math import Equation, FunctionCall, Number, Variable

from .ac import ACConfiguration, ACConfigurationError, ACResult, solve_ac
from .diode import has_diodes, solve_diode_network
from .dynamic import TransientDynamicStateHandler
from .mode import SimulationMode
from .model import SimulationComponent, SimulationModel
from .network import build_network_equation_system
from .session import SimulationSession
from .solver import SimulationResult, SimulationSolver, SolverError
from .state import DynamicState, DynamicStateSnapshot, TransientStateHandler, TransientStepContext
from .transient import TransientConfiguration, TransientConfigurationError
from .transistor import has_transistors, solve_transistor_network

DC_OPERATING_POINT = "dc_operating_point"
DC_SWEEP = "dc_sweep"
TRANSIENT = "transient"
AC = "ac"
FREQUENCY_SWEEP = "frequency_sweep"
SUPPORTED_ANALYSES = (DC_OPERATING_POINT, DC_SWEEP, TRANSIENT, AC, FREQUENCY_SWEEP)
MAX_SWEEP_POINTS = 10_000

class SimulationAnalysisError(ValueError):
    """Raised when a simulation analysis configuration is invalid."""

@dataclass(frozen=True)
class SimulationConfiguration:
    mode: SimulationMode = SimulationMode.STATIC
    analysis: str = DC_OPERATING_POINT
    settings: Mapping[str, object] = field(default_factory=dict)
    outputs: tuple[str, ...] = ()
    @classmethod
    def from_dict(cls, value: Mapping[str, object] | None) -> "SimulationConfiguration":
        if value is None: return cls()
        if not isinstance(value, Mapping): raise SimulationAnalysisError("simulation must be an object")
        raw_mode = value.get("mode", SimulationMode.STATIC.value)
        try: mode = SimulationMode(raw_mode)
        except (TypeError, ValueError): raise SimulationAnalysisError(f"Unsupported simulation mode '{raw_mode}'. Supported modes: {', '.join(item.value for item in SimulationMode)}") from None
        analysis = value.get("analysis", DC_OPERATING_POINT)
        if not isinstance(analysis, str) or not analysis: raise SimulationAnalysisError("simulation.analysis must be a non-empty string")
        if analysis not in SUPPORTED_ANALYSES: raise SimulationAnalysisError(f"Unsupported simulation analysis '{analysis}'. Supported analyses: {', '.join(SUPPORTED_ANALYSES)}")
        settings = value.get("settings", {})
        if not isinstance(settings, Mapping): raise SimulationAnalysisError("simulation.settings must be an object")
        outputs = value.get("outputs", [])
        if not isinstance(outputs, list) or not all(isinstance(item, str) for item in outputs): raise SimulationAnalysisError("simulation.outputs must be a list of strings")
        if analysis == DC_SWEEP: cls._validate_dc_sweep_settings(settings)
        elif analysis == TRANSIENT:
            try: TransientConfiguration.from_dict(settings)
            except TransientConfigurationError as exc: raise SimulationAnalysisError(str(exc)) from exc
        elif analysis == AC:
            try: ACConfiguration.from_dict(settings)
            except ACConfigurationError as exc: raise SimulationAnalysisError(str(exc)) from exc
        elif analysis == FREQUENCY_SWEEP: cls._validate_frequency_sweep_settings(settings)
        return cls(mode=mode, analysis=analysis, settings=dict(settings), outputs=tuple(outputs))
    @staticmethod
    def _validate_dc_sweep_settings(settings):
        source_id=settings.get("source");
        if not isinstance(source_id,str) or not source_id: raise SimulationAnalysisError("dc_sweep.settings.source must be a non-empty string")
        parameter=settings.get("parameter")
        if parameter is not None and (not isinstance(parameter,str) or not parameter): raise SimulationAnalysisError("dc_sweep.settings.parameter must be a non-empty string when provided")
        for name in ("start","stop","step"): _parse_finite_decimal(settings.get(name),name,"dc_sweep")
        step=_parse_finite_decimal(settings.get("step"),"step","dc_sweep"); start=_parse_finite_decimal(settings.get("start"),"start","dc_sweep"); stop=_parse_finite_decimal(settings.get("stop"),"stop","dc_sweep")
        if step==0: raise SimulationAnalysisError("dc_sweep.settings.step must not be zero")
        if start<stop and step<0: raise SimulationAnalysisError("dc_sweep.settings.step must be positive when start is below stop")
        if start>stop and step>0: raise SimulationAnalysisError("dc_sweep.settings.step must be negative when start is above stop")
        if _count_sweep_points(start,stop,step)>MAX_SWEEP_POINTS: raise SimulationAnalysisError(f"dc_sweep produces more than {MAX_SWEEP_POINTS} points")
    @staticmethod
    def _validate_frequency_sweep_settings(settings):
        for name in ("start","stop","step"): _parse_finite_decimal(settings.get(name),name,"frequency_sweep")
        start=_parse_finite_decimal(settings.get("start"),"start","frequency_sweep"); stop=_parse_finite_decimal(settings.get("stop"),"stop","frequency_sweep"); step=_parse_finite_decimal(settings.get("step"),"step","frequency_sweep")
        if start<=0 or stop<=0: raise SimulationAnalysisError("frequency_sweep start and stop must be greater than zero")
        if step==0: raise SimulationAnalysisError("frequency_sweep step must not be zero")
        if start<stop and step<0: raise SimulationAnalysisError("frequency_sweep step must be positive when start is below stop")
        if start>stop and step>0: raise SimulationAnalysisError("frequency_sweep step must be negative when start is above stop")
        amplitude=_parse_finite_decimal(settings.get("amplitude",1.0),"amplitude","frequency_sweep")
        if amplitude<0: raise SimulationAnalysisError("frequency_sweep amplitude must not be negative")
        _parse_finite_decimal(settings.get("phase",0.0),"phase","frequency_sweep")
        if _count_sweep_points(start,stop,step)>MAX_SWEEP_POINTS: raise SimulationAnalysisError(f"frequency_sweep produces more than {MAX_SWEEP_POINTS} points")
    def to_dict(self): return {"mode":self.mode.value,"analysis":self.analysis,"settings":dict(self.settings),"outputs":list(self.outputs)}

@dataclass(frozen=True)
class DCSweepResult:
    source_id: str; parameter: str; points: tuple[Decimal,...]; results: tuple[SimulationResult|None,...]; errors: tuple[str|None,...]
@dataclass(frozen=True)
class FrequencySweepResult:
    points: tuple[Decimal,...]; results: tuple[ACResult|None,...]; errors: tuple[str|None,...]
@dataclass(frozen=True)
class TransientResult:
    points: tuple[float,...]; results: tuple[SimulationResult|None,...]; errors: tuple[str|None,...]; state_snapshots: tuple[DynamicStateSnapshot,...]=(); step_contexts: tuple[TransientStepContext,...]=()
class SimulationAnalysis(Protocol): key: str

class DCSweepAnalysis:
    key=DC_SWEEP
    def run(self,model,*,known=None,configuration=None,session=None):
        if configuration is None: raise SimulationAnalysisError("dc_sweep requires a simulation configuration")
        source_id,parameter,start,stop,step=self._parse_settings(configuration.settings,model); points=_build_sweep_points(start,stop,step); results=[]; errors=[]
        for point in points:
            _check_cancel(session)
            try:
                sweep_model=_set_parameter(model,source_id,parameter,float(point)); result=_solve(sweep_model,known or {},dc_mode=True); results.append(result); errors.append(None)
                if session is not None: session.record_point(result,time=float(point))
            except SolverError as exc:
                message=str(exc) or "DC sweep point did not converge"; results.append(None); errors.append(message)
                if session is not None: session.record_point({"status":"failed","error":message},time=float(point))
        return DCSweepResult(source_id,parameter,tuple(points),tuple(results),tuple(errors))
    @staticmethod
    def _parse_settings(settings,model):
        source_id=settings.get("source")
        if not isinstance(source_id,str) or not source_id: raise SimulationAnalysisError("dc_sweep.settings.source must be a non-empty string")
        matches=[c for c in model.components if c.component_id==source_id]
        if not matches: raise SimulationAnalysisError(f"dc_sweep target '{source_id}' does not exist in the circuit")
        if len(matches)>1: raise SimulationAnalysisError(f"dc_sweep target '{source_id}' is not unique")
        target=matches[0]; parameter=settings.get("parameter"); expected={"VoltageSource":"V","CurrentSource":"I"}.get(target.component_type)
        if parameter is None:
            if expected is None: raise SimulationAnalysisError(f"dc_sweep target '{source_id}' requires a parameter")
            parameter=expected
        if not isinstance(parameter,str) or not parameter: raise SimulationAnalysisError("dc_sweep.settings.parameter must be a non-empty string")
        if expected is not None and parameter!=expected: raise SimulationAnalysisError(f"dc_sweep source '{source_id}' must be swept using parameter '{expected}'")
        if parameter not in target.parameters: raise SimulationAnalysisError(f"dc_sweep target '{source_id}' does not expose parameter '{parameter}'")
        return source_id,parameter,_parse_finite_decimal(settings.get("start"),"start","dc_sweep"),_parse_finite_decimal(settings.get("stop"),"stop","dc_sweep"),_parse_finite_decimal(settings.get("step"),"step","dc_sweep")

class FrequencySweepAnalysis:
    key=FREQUENCY_SWEEP
    def run(self,model,*,known=None,configuration=None,session=None):
        if configuration is None: raise SimulationAnalysisError("frequency_sweep requires a simulation configuration")
        if has_transistors(model): raise SimulationAnalysisError("frequency_sweep does not yet support BJT small-signal modeling")
        start=_parse_finite_decimal(configuration.settings.get("start"),"start","frequency_sweep"); stop=_parse_finite_decimal(configuration.settings.get("stop"),"stop","frequency_sweep"); step=_parse_finite_decimal(configuration.settings.get("step"),"step","frequency_sweep")
        amplitude=float(configuration.settings.get("amplitude",1.0)); phase=float(configuration.settings.get("phase",0.0)); points=_build_sweep_points(start,stop,step); results=[]; errors=[]
        for point in points:
            _check_cancel(session)
            try: result=solve_ac(model,ACConfiguration(frequency=float(point),amplitude=amplitude,phase=phase))
            except (ACConfigurationError,SolverError) as exc:
                message=str(exc) or "Frequency point did not converge"; results.append(None); errors.append(message)
                if session is not None: session.record_point({"status":"failed","error":message},time=float(point)); continue
            results.append(result); errors.append(None)
            if session is not None: session.record_point(result,time=float(point))
        return FrequencySweepResult(tuple(points),tuple(results),tuple(errors))

class TransientAnalysis:
    key=TRANSIENT
    def __init__(self,state_handler:TransientStateHandler|None=None): self.state_handler=state_handler or TransientDynamicStateHandler()
    def run(self,model,*,known=None,configuration=None,session=None):
        if configuration is None: raise SimulationAnalysisError("transient requires a simulation configuration")
        transient=TransientConfiguration.from_dict(configuration.settings); output_points=transient.time_points(); execution_points=_build_transient_execution_points(transient); output_start=float(transient.start); results=[]; errors=[]; states=[]; contexts=[]; base_known=dict(known or {}); state=DynamicState(); previous_time=None
        for time in execution_points:
            _check_cancel(session); dt=None if previous_time is None else time-previous_time; context=TransientStepContext(time=time,previous_time=previous_time,dt=dt); previous_state=state.snapshot(); step_model=self.state_handler.prepare_step(model,previous_state,context)
            if step_model is None: raise SimulationAnalysisError("transient state handler returned no model")
            try: result=_solve(step_model,base_known)
            except SolverError as exc:
                message=str(exc) or "Transient operating point did not converge"
                if time>=output_start: results.append(None); errors.append(message); states.append(previous_state); contexts.append(context); session.record_point({"status":"failed","error":message},time=time) if session is not None else None
                previous_time=time; continue
            self.state_handler.accept_step(state,result,context)
            if time>=output_start: results.append(result); errors.append(None); states.append(state.snapshot()); contexts.append(context); session.record_point(result,time=time) if session is not None else None
            previous_time=time
        return TransientResult(tuple(output_points),tuple(results),tuple(errors),tuple(states),tuple(contexts))

class ACAnalysis:
    key=AC
    def run(self,model,*,known=None,configuration=None,session=None):
        if configuration is None: raise SimulationAnalysisError("ac requires a simulation configuration")
        if has_transistors(model): raise SimulationAnalysisError("ac does not yet support BJT small-signal modeling")
        result=solve_ac(model,ACConfiguration.from_dict(configuration.settings))
        if session is not None: session.record_point(result,time=0.0)
        return result

def _build_transient_execution_points(configuration):
    output_points=configuration.time_points(); start=float(configuration.start)
    if start<=0: return output_points
    warmup=TransientConfiguration(start=0.0,stop=start,step=float(configuration.step)).time_points(); return tuple(warmup[:-1])+output_points

def _solve(model,known,*,dc_mode=False):
    if dc_mode: model=_apply_dc_equivalents(model)
    if has_diodes(model) and has_transistors(model): raise SimulationAnalysisError("Circuits containing both diodes and BJTs are not yet supported by the combined nonlinear solver")
    if has_diodes(model): return solve_diode_network(model,known=known)
    if has_transistors(model): return solve_transistor_network(model,known=known)
    equation_system=build_network_equation_system(model); solved=SimulationSolver().solve(equation_system,known=known); return SimulationResult(values=solved.values,instances={component.name:component for component in model.components})

def _apply_dc_equivalents(model):
    components=[]
    for component in model.components:
        if component.component_type=="Capacitor": components.append(replace(component,equations=[Equation(left=FunctionCall("current",(Variable("p"),Variable("n"))),right=Number(0.0))]))
        elif component.component_type=="Inductor": components.append(replace(component,equations=[Equation(left=FunctionCall("voltage",(Variable("p"),Variable("n"))),right=Number(0.0))]))
        else: components.append(component)
    return SimulationModel(components=components,nodes=set(model.nodes))

def _set_parameter(model,component_id,parameter,value):
    components=[]
    for component in model.components: components.append(replace(component,parameters={**component.parameters,parameter:value}) if component.component_id==component_id else component)
    return SimulationModel(components=components,nodes=set(model.nodes))

def _check_cancel(session):
    if session is not None and session.cancel_requested: session.cancel(); raise SimulationAnalysisError("simulation was cancelled")

def _parse_finite_decimal(value,name,context="simulation"):
    if isinstance(value,bool) or value is None: raise SimulationAnalysisError(f"{context}.settings.{name} must be a finite number")
    try: parsed=Decimal(str(value))
    except (InvalidOperation,ValueError): raise SimulationAnalysisError(f"{context}.settings.{name} must be a finite number") from None
    if not parsed.is_finite(): raise SimulationAnalysisError(f"{context}.settings.{name} must be a finite number")
    return parsed

def _count_sweep_points(start,stop,step): return int(((stop-start)/step).to_integral_value(rounding="ROUND_FLOOR"))+1 if ((stop-start)/step)>=0 else 0

def _build_sweep_points(start,stop,step):
    values=[]; current=start; epsilon=abs(step)*Decimal("1e-12")+Decimal("1e-15")
    while True:
        if (step>0 and current>stop+epsilon) or (step<0 and current<stop-epsilon): break
        values.append(current); current+=step
        if len(values)>MAX_SWEEP_POINTS: raise SimulationAnalysisError(f"simulation sweep produces more than {MAX_SWEEP_POINTS} points")
    return tuple(values)

def get_simulation_analysis(key):
    analyses={DC_OPERATING_POINT:DCOperatingPointAnalysis(),DC_SWEEP:DCSweepAnalysis(),TRANSIENT:TransientAnalysis(),AC:ACAnalysis(),FREQUENCY_SWEEP:FrequencySweepAnalysis()}
    try: return analyses[key]
    except KeyError: raise SimulationAnalysisError(f"Unsupported simulation analysis '{key}'") from None

class DCOperatingPointAnalysis:
    key=DC_OPERATING_POINT
    def run(self,model,*,known=None,configuration=None,session=None):
        result=_solve(model,known or {},dc_mode=True)
        if session is not None: session.record_point(result,time=0.0)
        return result
