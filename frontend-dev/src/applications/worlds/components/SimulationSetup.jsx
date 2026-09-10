import {
  DEFAULT_AC_SETTINGS,
  DEFAULT_DC_SWEEP_SETTINGS,
  DEFAULT_TRANSIENT_SETTINGS,
  getAcValidationError,
  getDcSweepValidationError,
  getSimulationAnalysisLabel,
  getTransientValidationError,
  SIMULATION_ANALYSES,
} from "../model/simulationConfig";

export default function SimulationSetup({ config, onChange, sweepTargets = [], voltageSources = [] }) {
  const allTargets = sweepTargets.length > 0 ? sweepTargets : voltageSources;
  const targets = allTargets.filter((target) => {
    const type = String(target.componentType ?? "").toLowerCase();
    return type.includes("voltage") || type.includes("current");
  });
  const sweepError = config.analysis === SIMULATION_ANALYSES.DC_SWEEP ? getDcSweepValidationError(config.settings, targets) : null;
  const transientError = config.analysis === SIMULATION_ANALYSES.TRANSIENT ? getTransientValidationError(config.settings) : null;
  const acError = config.analysis === SIMULATION_ANALYSES.AC ? getAcValidationError(config.settings) : null;
  const selectedTarget = targets.find((target) => target.id === config.settings?.source);
  const selectedParameter = selectedTarget?.parameters?.[0] ?? null;

  const changeAnalysis = (analysis) => {
    if (analysis === SIMULATION_ANALYSES.DC_SWEEP) onChange({ analysis, settings: { ...DEFAULT_DC_SWEEP_SETTINGS, ...config.settings } });
    else if (analysis === SIMULATION_ANALYSES.TRANSIENT) onChange({ analysis, settings: { ...DEFAULT_TRANSIENT_SETTINGS, ...config.settings } });
    else if (analysis === SIMULATION_ANALYSES.AC) onChange({ analysis, settings: { ...DEFAULT_AC_SETTINGS, ...config.settings } });
    else onChange({ analysis, settings: {} });
  };
  const changeSetting = (name, value) => onChange({ settings: { [name]: value === "" ? "" : Number(value) } });
  const changeSweepSetting = (name, value) => onChange({ settings: { [name]: name === "source" || name === "parameter" ? value : value === "" ? "" : Number(value) } });
  const changeSweepTarget = (source) => {
    const target = targets.find((item) => item.id === source);
    onChange({ settings: { source, parameter: target?.parameters?.[0]?.parameter ?? "" } });
  };

  return (
    <div className="px-4 py-4">
      <label className="block">
        <span className="text-[10px] font-medium text-[#69717b]">Analysis</span>
        <select value={config.analysis} onChange={(event) => changeAnalysis(event.target.value)} className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]">
          <option value={SIMULATION_ANALYSES.DC_OPERATING_POINT}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.DC_OPERATING_POINT)}</option>
          <option value={SIMULATION_ANALYSES.DC_SWEEP}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.DC_SWEEP)}</option>
          <option value={SIMULATION_ANALYSES.TRANSIENT}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.TRANSIENT)}</option>
          <option value={SIMULATION_ANALYSES.AC}>{getSimulationAnalysisLabel(SIMULATION_ANALYSES.AC)}</option>
        </select>
      </label>

      {config.analysis === SIMULATION_ANALYSES.DC_OPERATING_POINT && <div className="mt-3 rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">Calculates the steady-state node voltages and branch currents for the current circuit. Capacitors are open circuits and inductors are shorts at DC.</div>}

      {config.analysis === SIMULATION_ANALYSES.AC && (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">AC uses sinusoidal excitation and reports complex phasor magnitude and phase for the current linear electrical model. Static AC is a single-frequency operating point; frequency-sweep/Bode analysis can build on the same AC representation.</div>
          <div className="grid grid-cols-3 gap-2">
            {[["frequency", "Frequency", "Hz"], ["amplitude", "Amplitude", "V/A"], ["phase", "Phase", "°"]].map(([name, label, unit]) => (
              <label key={name} className="block">
                <span className="text-[10px] font-medium text-[#69717b]">{label}</span>
                <div className="relative mt-1"><input type="number" value={config.settings?.[name] ?? ""} onChange={(event) => changeSetting(name, event.target.value)} step="any" className="w-full rounded-md border border-[#d9dde2] bg-white px-2 py-2 pr-7 text-xs text-[#26364d] outline-none focus:border-[#58718f]" /><span className="pointer-events-none absolute right-2 top-2 text-[9px] text-[#8a929c]">{unit}</span></div>
              </label>
            ))}
          </div>
          {acError && <div role="alert" className="rounded-md border border-[#ead1d1] bg-[#fff8f8] px-3 py-2.5 text-[10px] leading-4 text-red-700">{acError}</div>}
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
          <div><label className="text-[10px] font-medium text-[#69717b]" htmlFor="sweep-target">Sweep source</label><select id="sweep-target" value={config.settings?.source ?? ""} onChange={(event) => changeSweepTarget(event.target.value)} className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]"><option value="">Select a voltage or current source...</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.label} ({target.componentType})</option>)}</select>{targets.length === 0 && <div className="mt-1 text-[9px] leading-4 text-[#8a929c]">No independent voltage or current sources are available in the current circuit.</div>}</div>
          {selectedParameter && <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5"><div className="text-[9px] font-medium uppercase tracking-[0.1em] text-[#69717b]">Sweep parameter</div><div className="mt-1 text-xs font-medium text-[#17253a]">{selectedParameter.label ?? selectedParameter.parameter}{selectedParameter.unit ? ` (${selectedParameter.unit})` : ""}</div></div>}
          <div className="grid grid-cols-3 gap-2">{[["start", "Start"], ["stop", "Stop"], ["step", "Step"]].map(([name, label]) => <label key={name} className="block"><span className="text-[10px] font-medium text-[#69717b]">{label}</span><input type="number" value={config.settings?.[name] ?? ""} onChange={(event) => changeSweepSetting(name, event.target.value)} step="any" className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]" /></label>)}</div>
          {sweepError && <div role="alert" className="rounded-md border border-[#ead1d1] bg-[#fff8f8] px-3 py-2.5 text-[10px] leading-4 text-red-700">{sweepError}</div>}
          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">Vary the selected independent source across the range and calculate a DC operating point at every sweep value.</div>
        </div>
      )}
    </div>
  );
}
