import {
  getSimulationAnalysisLabel,
  SIMULATION_ANALYSES,
} from "../model/simulationConfig";

export default function SimulationSetup({ config, onChange }) {
  return (
    <div className="border-b border-[#e4e7eb] px-4 py-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">
        Simulation Setup
      </div>

      <label className="block">
        <span className="text-[10px] font-medium text-[#69717b]">Analysis</span>
        <select
          value={config.analysis}
          onChange={(event) => onChange({ analysis: event.target.value })}
          className="mt-1 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]"
        >
          <option value={SIMULATION_ANALYSES.DC_OPERATING_POINT}>
            {getSimulationAnalysisLabel(SIMULATION_ANALYSES.DC_OPERATING_POINT)}
          </option>
          <option value="dc_sweep" disabled>
            DC Sweep (coming later)
          </option>
          <option value="transient" disabled>
            Transient (coming later)
          </option>
          <option value="ac" disabled>
            AC Analysis (coming later)
          </option>
        </select>
      </label>

      <div className="mt-3 rounded-md border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-[10px] leading-4 text-[#69717b]">
        DC Operating Point calculates the steady-state node voltages and branch currents for the current circuit.
      </div>
    </div>
  );
}
