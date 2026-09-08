import { useEffect, useMemo, useState } from "react";
import { createResultPlot } from "../model/resultPlot.js";
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

  useEffect(() => { if (selectedSeries) dispatchSelection(selectedSeries); }, [selectedSeries]);

  const selectScope = (next) => { setScope(next); setSelectedKey(null); };
  const selectMeasurement = (next) => { setMeasurement(next); setSelectedKey(null); };
  const selectSeries = (next) => { setSelectedKey(next); const item = scopedSeries.find((entry) => entry.key === next); dispatchSelection(item); };

  if (!result) return null;

  const components = Object.entries(result?.components ?? {});
  const voltageSources = components.filter(([, component]) => String(component?.type ?? "").toLowerCase().includes("voltage"));
  const singleSource = voltageSources.length === 1 ? voltageSources[0][1] : null;
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
        <div className="mt-1 text-xs text-[#8a929c]">Choose a circuit area, then choose the quantity to inspect.</div>
      </div>

      <div className="grid grid-cols-3 border-b border-[#e4e7eb]" role="tablist" aria-label="Result area">
        <button type="button" role="tab" aria-selected={scope === "summary"} onClick={() => selectScope("summary")} className={`px-3 py-3 text-xs font-medium ${scope === "summary" ? "bg-[#f7f9fb] text-[#17253a]" : "text-[#69717b] hover:bg-[#fafbfc]"}`}>Circuit Summary</button>
        <button type="button" role="tab" aria-selected={scope === RESULT_SCOPES.COMPONENTS} onClick={() => selectScope(RESULT_SCOPES.COMPONENTS)} className={`border-l border-[#e4e7eb] px-3 py-3 text-xs font-medium ${scope === RESULT_SCOPES.COMPONENTS ? "bg-[#f7f9fb] text-[#17253a]" : "text-[#69717b] hover:bg-[#fafbfc]"}`}>Components</button>
        <button type="button" role="tab" aria-selected={scope === RESULT_SCOPES.NODES} onClick={() => selectScope(RESULT_SCOPES.NODES)} className={`border-l border-[#e4e7eb] px-3 py-3 text-xs font-medium ${scope === RESULT_SCOPES.NODES ? "bg-[#f7f9fb] text-[#17253a]" : "text-[#69717b] hover:bg-[#fafbfc]"}`}>Nodes</button>
      </div>

      {scope === "summary" ? (
        <div className="p-4">
          {voltageSources.length === 0 ? <div className="rounded-lg border border-dashed border-[#d9dde2] px-3 py-4 text-xs text-[#69717b]">No voltage source detected.</div> : voltageSources.length > 1 ? <div className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-3 text-xs text-[#69717b]">{voltageSources.length} voltage sources are present.</div> : (
            <div className="grid grid-cols-3 gap-2">
              {[["Voltage", singleSource.voltage, "V"], ["Current", singleSource.current, "A"], ["Power", singleSource.power, "W"]].map(([label, value, unit]) => <div key={label} className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5"><div className="text-[9px] uppercase tracking-[0.1em] text-[#69717b]">{label}</div><div className="mt-1 font-mono text-sm font-semibold text-[#17253a]">{formatValue(value, unit)}</div></div>)}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7eb] bg-[#fafbfc] px-4 py-3">
            <div className="text-xs font-medium text-[#17253a]">{scopedSeries.length} {scope === RESULT_SCOPES.NODES ? "nodes" : "components"}</div>
            <div className="flex items-center gap-1 rounded-md border border-[#d9dde2] bg-white p-0.5" role="group" aria-label="Result measurement">
              {[RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER].map((item) => <button key={item} type="button" disabled={!availableMeasurements.includes(item)} aria-pressed={effectiveMeasurement === item} onClick={() => selectMeasurement(item)} className={`rounded px-2.5 py-1.5 text-[10px] font-medium ${effectiveMeasurement === item ? "bg-[#edf3f8] text-[#17253a]" : "text-[#69717b] hover:bg-[#f5f7f9]"} disabled:cursor-not-allowed disabled:opacity-35`}>{units[item]}</button>)}
            </div>
          </div>

          <div className="divide-y divide-[#e4e7eb]">
            {scopedSeries.length === 0 ? <div className="px-4 py-6 text-xs text-[#69717b]">No {labels[effectiveMeasurement]?.toLowerCase() ?? "measurement"} results are available for this scope.</div> : scopedSeries.map((item) => {
              const value = item.values?.[0]?.value;
              const active = item.key === selectedSeries?.key;
              return <button key={item.key} type="button" onClick={() => selectSeries(item.key)} aria-pressed={active} className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${active ? "bg-[#f3f6f8]" : "bg-white hover:bg-[#fafbfc]"}`}>
                <div className="min-w-0"><div className="truncate text-xs font-medium text-[#17253a]">{item.contextTitle}</div><div className="mt-0.5 text-[9px] text-[#8a929c]">{labels[effectiveMeasurement]}</div></div>
                <div className="shrink-0 font-mono text-xs font-medium text-[#17253a]">{isSweep ? "View →" : formatValue(value, item.unit)}</div>
              </button>;
            })}
          </div>

          {selectedSeries && <div className="border-t border-[#e4e7eb] bg-[#f7f9fb] px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#58718f]">{labels[effectiveMeasurement]}</div><div className="mt-1 truncate text-xs font-medium text-[#17253a]">{selectedSeries.contextTitle}</div></div><button type="button" onClick={() => dispatchSelection(selectedSeries)} className="shrink-0 rounded-md border border-[#cfd5dc] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#26364d] hover:bg-[#f3f5f7]">Show in circuit</button></div></div>}
          {plot && <div className="border-t border-[#e4e7eb] p-3"><ResultChart plot={plot} series={selectedSeries} /></div>}
        </>
      )}
    </section>
  );
}
