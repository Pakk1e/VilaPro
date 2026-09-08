import { useEffect, useMemo, useState } from "react";
import { createResultPlot } from "../model/resultPlot.js";
import { getCircuitComponent, getCircuitNode } from "../model/resultContext.js";
import { RESULT_MEASUREMENTS, RESULT_SCOPES } from "../model/sweepResults.js";
import { getExplorerMeasurements, getExplorerSeries, getResultSeries } from "../model/resultExplorer.js";
import ResultChart from "./ResultChart";

const labels = { voltage: "Voltage", current: "Current", power: "Power" };
const units = { voltage: "V", current: "A", power: "W" };

function formatValue(value, unit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (unit === "A") return Math.abs(number) >= 1 ? `${number.toFixed(2)} A` : `${(number * 1000).toFixed(1)} mA`;
  if (unit === "W") return Math.abs(number) >= 1 ? `${number.toFixed(2)} W` : `${(number * 1000).toFixed(1)} mW`;
  return `${number.toFixed(2)} V`;
}

function dispatchSelection(series) {
  if (!series) return;
  window.dispatchEvent(new CustomEvent("worlds:select-result", { detail: { entityType: series.entityType, entityId: series.entityId } }));
}

export default function ResultExplorer({ result }) {
  const series = useMemo(() => getResultSeries(result), [result]);
  const [scope, setScope] = useState(RESULT_SCOPES.COMPONENTS);
  const [measurement, setMeasurement] = useState(RESULT_MEASUREMENTS.VOLTAGE);
  const [selectedKey, setSelectedKey] = useState(null);
  const availableMeasurements = getExplorerMeasurements(scope, series);
  const effectiveMeasurement = availableMeasurements.includes(measurement) ? measurement : availableMeasurements[0] ?? null;
  const scopedSeries = useMemo(() => getExplorerSeries(series, scope, effectiveMeasurement), [series, scope, effectiveMeasurement]);
  const selectedSeries = scopedSeries.find((item) => item.key === selectedKey) ?? scopedSeries[0] ?? null;
  const isSweep = result?.analysis === "dc_sweep";

  useEffect(() => {
    if (selectedSeries) dispatchSelection(selectedSeries);
  }, [selectedSeries]);

  const selectScope = (next) => { setScope(next); setSelectedKey(null); };
  const selectMeasurement = (next) => { setMeasurement(next); setSelectedKey(null); };
  const selectSeries = (next) => { setSelectedKey(next); const item = scopedSeries.find((entry) => entry.key === next); dispatchSelection(item); };

  if (!result) return null;

  const plot = isSweep && selectedSeries ? createResultPlot({
    xLabel: result?.result?.analysis_information?.sweep?.source ?? "Sweep",
    xUnit: result?.result?.analysis_information?.sweep?.parameter === "I" ? "A" : "V",
    xValues: result?.result?.datasets?.find((dataset) => dataset.name === "sweep")?.values ?? [],
    series: [selectedSeries],
  }) : null;

  return (
    <section role="region" aria-label="Simulation results" className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
      <div className="border-b border-[#e4e7eb] px-4 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Results</div>
        <div className="mt-1 text-xs text-[#8a929c]">Choose what you want to inspect in the circuit.</div>
      </div>

      <div className="border-b border-[#e4e7eb] px-4 pt-3">
        <div className="flex gap-1" role="tablist" aria-label="Result scope">
          {[RESULT_SCOPES.COMPONENTS, RESULT_SCOPES.NODES].map((item) => (
            <button key={item} type="button" role="tab" aria-selected={scope === item} onClick={() => selectScope(item)} className={`rounded-t-md px-3 py-2 text-xs font-medium ${scope === item ? "border border-b-white border-[#d9dde2] bg-white text-[#17253a]" : "text-[#69717b] hover:bg-[#f7f9fb]"}`}>
              {item === RESULT_SCOPES.COMPONENTS ? "Components" : "Nodes"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7eb] bg-[#fafbfc] px-4 py-3">
        <div className="text-xs font-medium text-[#17253a]">{scopedSeries.length} {scope === RESULT_SCOPES.NODES ? "nodes" : "components"}</div>
        <div className="flex items-center gap-1 rounded-md border border-[#d9dde2] bg-white p-0.5" role="group" aria-label="Result measurement">
          {[RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER].map((item) => (
            <button key={item} type="button" disabled={!availableMeasurements.includes(item)} aria-pressed={effectiveMeasurement === item} onClick={() => selectMeasurement(item)} className={`rounded px-2.5 py-1.5 text-[10px] font-medium ${effectiveMeasurement === item ? "bg-[#edf3f8] text-[#17253a]" : "text-[#69717b] hover:bg-[#f5f7f9]"} disabled:cursor-not-allowed disabled:opacity-35`}>{units[item]}</button>
          ))}
        </div>
      </div>

      {scopedSeries.length > 0 ? (
        <>
          <div className="border-b border-[#e4e7eb] px-4 py-3">
            <label className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69717b]" htmlFor="result-target">Result</label>
            <select id="result-target" aria-label="Result target" value={selectedSeries?.key ?? ""} onChange={(event) => selectSeries(event.target.value)} className="mt-1.5 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d]">
              {scopedSeries.map((item) => <option key={item.key} value={item.key}>{item.contextTitle}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between border-b border-[#e4e7eb] bg-[#f7f9fb] px-4 py-2.5">
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#58718f]">{labels[effectiveMeasurement]}</div>
              <div className="mt-1 truncate text-xs font-medium text-[#17253a]">{selectedSeries.contextTitle}</div>
            </div>
            <button type="button" onClick={() => dispatchSelection(selectedSeries)} className="shrink-0 rounded-md border border-[#cfd5dc] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#26364d] hover:bg-[#f3f5f7]">Show in circuit</button>
          </div>

          {!isSweep && selectedSeries.values?.[0] && (
            <div className="border-b border-[#e4e7eb] px-4 py-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">Value</div>
              <div className="mt-1 font-mono text-base font-semibold text-[#17253a]">{formatValue(selectedSeries.values[0].value, selectedSeries.unit)}</div>
            </div>
          )}

          {plot && <div className="p-3"><ResultChart plot={plot} series={selectedSeries} /></div>}
        </>
      ) : (
        <div className="px-4 py-6 text-xs text-[#69717b]">No {labels[effectiveMeasurement]?.toLowerCase() ?? "measurement"} results are available for this scope.</div>
      )}
    </section>
  );
}
