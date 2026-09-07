import {
  DEFAULT_DC_SWEEP_SETTINGS,
  getDcSweepValidationError,
  getSimulationAnalysisLabel,
  SIMULATION_ANALYSES,
} from "../model/simulationConfig";

export default function SimulationSetup({ config, onChange }) {
  const sweepError = config.analysis === SIMULATION_ANALYSES.DC_SWEEP
    ? getDcSweepValidationError(config.settings, config.settings?.source ? [config.settings.source] : [])
    : null;

  const changeAnalysis = (analysis) => {
    if (analysis === SIMULATION_ANALYSES.DC_SWEEP) {
      onChange({
        analysis,
        settings: {
          ...DEFAULT_DC_SWEEP_SETTINGS,
          ...config.settings,
        },
      });
      return;
    }

    onChange({ analysis, settings: {} });
  };

  const changeSweepSetting = (name, value) => {
    onChange({
      settings: {
        [name]: name === "source" ? value : value === "" ? "" : Number(value),
      },
    });
  };

  return (
    <div className="px-4 py-4">
      <label className="block">
        <span className="text-[10px] font-medium text-[#69717b]">Analysis</span>
        <select
          value={config.analysis}
          onChange={(event) => changeAnalysis(event.target.value)}
          className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]"
        >
          <option value={SIMULATION_ANALYSES.DC_OPERATING_POINT}>
            {getSimulationAnalysisLabel(SIMULATION_ANALYSES.DC_OPERATING_POINT)}
          </option>
          <option value={SIMULATION_ANALYSES.DC_SWEEP}>
            {getSimulationAnalysisLabel(SIMULATION_ANALYSES.DC_SWEEP)}
          </option>
          <option value="transient" disabled>Transient (coming later)</option>
          <option value="ac" disabled>AC Analysis (coming later)</option>
        </select>
      </label>

      {config.analysis === SIMULATION_ANALYSES.DC_OPERATING_POINT && (
        <div className="mt-3 rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">
          Calculates the steady-state node voltages and branch currents for the current circuit.
        </div>
      )}

      {config.analysis === SIMULATION_ANALYSES.DC_SWEEP && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] font-medium text-[#69717b]" htmlFor="sweep-source">Voltage source ID</label>
            <input
              id="sweep-source"
              type="text"
              value={config.settings?.source ?? ""}
              onChange={(event) => changeSweepSetting("source", event.target.value)}
              placeholder="Select a voltage source component"
              className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]"
            />
            <div className="mt-1 text-[9px] leading-4 text-[#8a929c]">Use the component ID from the circuit/inspector. A visual source picker will follow with the result UI.</div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[["start", "Start"], ["stop", "Stop"], ["step", "Step"]].map(([name, label]) => (
              <label key={name} className="block">
                <span className="text-[10px] font-medium text-[#69717b]">{label}</span>
                <input
                  type="number"
                  value={config.settings?.[name] ?? ""}
                  onChange={(event) => changeSweepSetting(name, event.target.value)}
                  step="any"
                  className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]"
                />
              </label>
            ))}
          </div>

          {sweepError && (
            <div role="alert" className="rounded-md border border-[#ead1d1] bg-[#fff8f8] px-3 py-2.5 text-[10px] leading-4 text-red-700">
              {sweepError}
            </div>
          )}

          <div className="rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">
            Sweeps the selected voltage source and runs a DC operating point at each value.
          </div>
        </div>
      )}
    </div>
  );
}
