import {
  DEFAULT_AC_SETTINGS,
  DEFAULT_DC_SWEEP_SETTINGS,
  DEFAULT_FREQUENCY_SWEEP_SETTINGS,
  DEFAULT_TRANSIENT_SETTINGS,
  getAcValidationError,
  getDcSweepValidationError,
  getFrequencySweepValidationError,
  getSimulationAnalysisLabel,
  getTransientValidationError,
  SIMULATION_ANALYSES,
} from "../model/simulationConfig";

export default function SimulationSetup({ config, onChange, sweepTargets = [], voltageSources = [] }) {
  const allTargets = sweepTargets.length > 0 ? sweepTargets : voltageSources;
  const targets = allTargets.filter((target) => Array.isArray(target.parameters) && target.parameters.length > 0);
  const sweepError = config.analysis === SIMULATION_ANALYSES.DC_SWEEP ? getDcSweepValidationError(config.settings, targets) : null;
  const frequencySweepError = config.analysis === SIMULATION_ANALYSES.FREQUENCY_SWEEP ? getFrequencySweepValidationError(config.settings) : null;
  const transientError = config.analysis === SIMULATION_ANALYSES.TRANSIENT ? getTransientValidationError(config.settings) : null;
  const acError = config.analysis === SIMULATION_ANALYSES.AC ? getAcValidationError(config.settings) : null;
  const selectedTarget = targets.find((target) => target.id === config.settings?.source);
  const selectedParameter = selectedTarget?.parameters?.find((item) => (typeof item === "string" ? item : item.parameter) === config.settings?.parameter) ?? null;

  const changeAnalysis = (analysis) => {
    if (analysis === SIMULATION_ANALYSES.DC_SWEEP) onChange({ analysis, settings: { ...DEFAULT_DC_SWEEP_SETTINGS, ...config.settings } });
    else if (analysis === SIMULATION_ANALYSES.FREQUENCY_SWEEP) onChange({ analysis, settings: { ...DEFAULT_FREQUENCY_SWEEP_SETTINGS, ...config.settings } });
    else if (analysis === SIMULATION_ANALYSES.TRANSIENT) onChange({ analysis, settings: { ...DEFAULT_TRANSIENT_SETTINGS, ...config.settings } });
    else if (analysis === SIMULATION_ANALYSES.AC) onChange({ analysis, settings: { ...DEFAULT_AC_SETTINGS, ...config.settings } });
    else onChange({ analysis, settings: {} });
  };
  const changeSetting = (name, value) => onChange({ settings: { [name]: value === "" ? "" : Number(value) } });
  const changeSweepSetting = (name, value) => onChange({ settings: { [name]: name === "source" || name === "parameter" ? value : value === "" ? "" : Number(value) } });
  const changeSweepTarget = (source) => {
    const target = targets.find((item) => item.id === source);
    const first = target?.parameters?.[0];
    onChange({ settings: { source, parameter: typeof first === "string" ? first : first?.parameter ?? "" } });
  };

  return (
    <div className="px-4 py-4">
      <label className="block text-[10px] font-medium text-[#69717b]" htmlFor="simulation-analysis">Analysis</label>
      <select id="simulation-analysis" value={config.analysis} onChange={(event) => changeAnalysis(event.target.value)} className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]">
        <option value={SIMULATION_ANALYSES.DC_OPERATING_POINT}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.DC_OPERATING_POINT)}</option>
        <option value={SIMULATION_ANALYSES.DC_SWEEP}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.DC_SWEEP)}</option>
        <option value={SIMULATION_ANALYSES.FREQUENCY_SWEEP}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.FREQUENCY_SWEEP)}</option>
        <option value={SIMULATION_ANALYSES.TRANSIENT}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.TRANSIENT)}</option>
        <option value={SIMULATION_ANALYSES.AC}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.AC)}</option>
      </select>

      {config.analysis === SIMULATION_ANALYSES.DC_OPERATING_POINT && <div className="mt-3 rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">Calculates the steady-state node voltages and branch currents for the current circuit. Capacitors are open circuits and inductors are shorts at DC.</div>}

      {config.analysis === SIMULATION_ANALYSES.AC && (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">AC uses sinusoidal excitation and reports complex phasor magnitude and phase for the current linear electrical model. Static AC is a single-frequency operating point; Frequency Sweep can build a response curve across a range of frequencies.</div>
          <div className="grid grid-cols-1 gap-3">
            {[["frequency", "Frequency", "Hz"], ["amplitude", "Amplitude", "V/A"], ["phase", "Phase", "°"]].map(([name, label, unit]) => (
              <label key={name} className="block min-w-0">
                <span className="text-[10px] font-medium text-[#69717b]">{label}</span>
                <div className="relative mt-1"><input type="number" value={config.settings?.[name] ?? ""} onChange={(event) => changeSetting(name, event.target.value)} step="any" className="w-full min-w-0 rounded-md border border-[#d9dde2] bg-white px-2.5 py-2.5 pr-12 text-sm tabular-nums text-[#26364d] outline-none focus:border-[#58718f]" /><span className="pointer-events-none absolute right-2.5 top-2.5 text-[9px] text-[#8a929c]">{unit}</span></div>
              </label>
            ))}
          </div>
          {acError && <div role="alert" className="rounded-md border border-[#ead1d1] bg-[#fff8f8] px-3 py-2.5 text-[10px] leading-4 text-red-700">{acError}</div>}
        </div>
      )}

      {config.analysis === SIMULATION_ANALYSES.FREQUENCY_SWEEP && (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">Runs small-signal AC analysis at each frequency. This is useful for RLC networks, resonant circuits and filter response. Results are plotted against frequency.</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{[["start", "Start", "Hz"], ["stop", "Stop", "Hz"], ["step", "Step", "Hz"]].map(([name, label, unit]) => <label key={name} className="block"><span className="text-[10px] font-medium text-[#69717b]">{label}</span><div className="relative mt-1"><input type="number" value={config.settings?.[name] ?? ""} onChange={(event) => changeSetting(name, event.target.value)} step="any" className="w-full rounded-md border border-[#d9dde2] bg-white px-2 py-2 pr-8 text-xs tabular-nums text-[#26364d] outline-none focus:border-[#58718f]" /><span className="pointer-events-none absolute right-2 top-2 text-[9px] text-[#8a929c]">{unit}</span></div></label>)}</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{[["amplitude", "Excitation amplitude", "V/A"], ["phase", "Excitation phase", "°"]].map(([name, label, unit]) => <label key={name} className="block"><span className="text-[10px] font-medium text-[#69717b]">{label}</span><div className="relative mt-1"><input type="number" value={config.settings?.[name] ?? ""} onChange={(event) => changeSetting(name, event.target.value)} step="any" className="w-full rounded-md border border-[#d9dde2] bg-white px-2 py-2 pr-10 text-xs tabular-nums text-[#26364d] outline-none focus:border-[#58718f]" /><span className="pointer-events-none absolute right-2 top-2 text-[9px] text-[#8a929c]">{unit}</span></div></label>)}</div>
          {frequencySweepError && <div role="alert" className="rounded-md border border-[#ead1d1] bg-[#fff8f8] px-3 py-2.5 text-[10px] leading-4 text-red-700">{frequencySweepError}</div>}
          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">Use a smaller step around an expected resonance. The sweep is linear in frequency; logarithmic spacing can be added later without changing the result model.</div>
        </div>
      )}

      {config.analysis === SIMULATION_ANALYSES.TRANSIENT && (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">Calculates circuit behavior over time. Capacitor and inductor initial conditions are taken from their component properties.</div>
          <div className="grid grid-cols-3 gap-2">{[["start", "Start", "s"], ["stop", "Stop", "s"], ["step", "Step", "s"]].map(([name, label, unit]) => <label key={name} className="block"><span className="text-[10px] font-medium text-[#69717b]">{label}</span><div className="relative mt-1"><input type="number" value={config.settings?.[name] ?? ""} onChange={(event) => changeSetting(name, event.target.value)} step="any" className="w-full rounded-md border border-[#d9dde2] bg-white px-2 py-2 pr-6 text-xs text-[#26364d] outline-none focus:border-[#58718f]" /><span className="pointer-events-none absolute right-2 top-2 text-[9px] text-[#8a929c]">{unit}</span></div></label>)}</div>
          {transientError && <div role="alert" className="rounded-md border border-[#ead1d1] bg-[#fff8f8] px-3 py-2.5 text-[10px] leading-4 text-red-700">{transientError}</div>}
          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">Time is the X-axis. The result explorer can expose node voltages, branch currents and component V/I/P series.</div>
        </div>
      )}

      {config.analysis === SIMULATION_ANALYSES.DC_SWEEP && (
        <div className="mt-4 space-y-3">
          <div><label className="text-[10px] font-medium text-[#69717b]" htmlFor="sweep-target">Sweep target</label><select id="sweep-target" value={config.settings?.source ?? ""} onChange={(event) => changeSweepTarget(event.target.value)} className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]"><option value="">Select a component or source...</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.label} ({target.componentType})</option>)}</select>{targets.length === 0 && <div className="mt-1 text-[9px] leading-4 text-[#8a929c]">No component or source parameters are available in the current circuit.</div>}</div>
          {selectedTarget && <div><label className="text-[10px] font-medium text-[#69717b]" htmlFor="sweep-parameter">Parameter</label><select id="sweep-parameter" value={config.settings?.parameter ?? ""} onChange={(event) => changeSweepSetting("parameter", event.target.value)} className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]" disabled={selectedTarget.parameters.length === 1}><option value="">Select a parameter...</option>{selectedTarget.parameters.map((item) => { const parameter = typeof item === "string" ? item : item.parameter; const label = typeof item === "string" ? item : item.label ?? item.parameter; return <option key={parameter} value={parameter}>{label}{item?.unit ? ` (${item.unit})` : ""}</option>; })}</select></div>}
          {selectedParameter && <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5"><div className="text-[9px] font-medium uppercase tracking-[0.1em] text-[#69717b]">Sweep parameter</div><div className="mt-1 text-xs font-medium text-[#17253a]">{selectedParameter.label ?? selectedParameter.parameter ?? selectedParameter}{selectedParameter.unit ? ` (${selectedParameter.unit})` : ""}</div></div>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{[["start", "Start"], ["stop", "Stop"], ["step", "Step"]].map(([name, label]) => <label key={name} className="block"><span className="text-[10px] font-medium text-[#69717b]">{label}</span><input type="number" value={config.settings?.[name] ?? ""} onChange={(event) => changeSweepSetting(name, event.target.value)} step="any" className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2 py-2 text-xs tabular-nums text-[#26364d] outline-none focus:border-[#58718f]" /></label>)}</div>
          {sweepError && <div role="alert" className="rounded-md border border-[#ead1d1] bg-[#fff8f8] px-3 py-2.5 text-[10px] leading-4 text-red-700">{sweepError}</div>}
          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">Sweep a component or source parameter and calculate a DC operating point at every value. Frequency response uses the dedicated Frequency Sweep analysis.</div>
        </div>
      )}
    </div>
  );
}
