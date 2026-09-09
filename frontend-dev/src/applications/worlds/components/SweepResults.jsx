import { useMemo, useState } from "react";
import { formatEngineeringValue } from "../model/engineeringFormat.js";

import { getCircuitComponent, getCircuitNode } from "../model/resultContext.js";
import {
  getAvailableMeasurements,
  getSweepInformation,
  getSweepPointStatuses,
  getSweepResponseSeries,
  getResultSeriesForScope,
  getSweepValues,
  RESULT_MEASUREMENTS,
  RESULT_SCOPES,
} from "../model/sweepResults.js";
import { createResultPlot, getNearestPlotRow } from "../model/resultPlot.js";
import ResultChart from "./ResultChart";

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}


function measurementLabel(type) {
  if (type === RESULT_MEASUREMENTS.VOLTAGE) return "Voltage";
  if (type === RESULT_MEASUREMENTS.CURRENT) return "Current";
  if (type === RESULT_MEASUREMENTS.POWER) return "Power";
  return "Measurement";
}

function measurementUnit(type) {
  if (type === RESULT_MEASUREMENTS.CURRENT) return "A";
  if (type === RESULT_MEASUREMENTS.POWER) return "W";
  return "V";
}

function SeriesContext({ result, series }) {
  if (!series) return null;
  const selectCircuit = () => window.dispatchEvent(new CustomEvent("worlds:select-result", { detail: { entityType: series.entityType, entityId: series.entityId } }));

  if (series.entityType === "node") {
    const node = getCircuitNode(result, series.entityId);
    return (
      <div className="border-b border-[#e4e7eb] bg-[#f7f9fb] px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#58718f]">Node</div>
            <div className="mt-1 truncate text-xs font-medium text-[#17253a]">{node?.is_ground ? "Ground" : series.contextTitle}</div>
          </div>
          <button type="button" onClick={selectCircuit} className="shrink-0 rounded-md border border-[#cfd5dc] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#26364d] hover:bg-[#f3f5f7]">Show in circuit</button>
        </div>
      </div>
    );
  }

  if (series.entityType === "branch") {
    return (
      <div className="border-b border-[#e4e7eb] bg-[#f7f9fb] px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#58718f]">Current</div><div className="mt-1 truncate text-xs font-medium text-[#17253a]">{series.contextTitle}</div></div>
          <button type="button" onClick={selectCircuit} className="shrink-0 rounded-md border border-[#cfd5dc] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#26364d] hover:bg-[#f3f5f7]">Show in circuit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[#e4e7eb] bg-[#f7f9fb] px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#58718f]">Component</div><div className="mt-1 truncate text-xs font-medium text-[#17253a]">{series.contextTitle}</div></div>
        <button type="button" onClick={selectCircuit} className="shrink-0 rounded-md border border-[#cfd5dc] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#26364d] hover:bg-[#f3f5f7]">Show in circuit</button>
      </div>
    </div>
  );
}

export default function SweepResults({ result }) {
  const information = getSweepInformation(result);
  const sweepValues = getSweepValues(result);
  const statuses = getSweepPointStatuses(result);
  const series = useMemo(() => getSweepResponseSeries(result), [result]);
  const [scope, setScope] = useState(RESULT_SCOPES.COMPONENTS);
  const [measurement, setMeasurement] = useState(RESULT_MEASUREMENTS.VOLTAGE);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);

  const availableMeasurements = getAvailableMeasurements(scope, series);
  const effectiveMeasurement = availableMeasurements.includes(measurement) ? measurement : availableMeasurements[0] ?? null;
  const scopedSeries = useMemo(() => getResultSeriesForScope(series, scope, effectiveMeasurement), [series, scope, effectiveMeasurement]);
  const selectedSeries = scopedSeries.find((item) => item.key === selectedSeriesKey) ?? scopedSeries[0] ?? null;
  const parameterUnit = information?.parameter === "I" ? "A" : "V";
  const sourceComponent = getCircuitComponent(result, information?.source);
  const sourceName = sourceComponent?.name ?? information?.source;
  const plot = createResultPlot({ xLabel: sourceName, xUnit: parameterUnit, xValues: sweepValues, series: selectedSeries ? [selectedSeries] : [] });
  const inspectedRow = selectedPointIndex == null ? null : getNearestPlotRow(plot, sweepValues[selectedPointIndex]);
  const inspectedIndex = selectedPointIndex == null ? null : inspectedRow ? sweepValues.findIndex((value) => value === inspectedRow.sweepValue) : selectedPointIndex;
  const inspectedValue = inspectedIndex == null ? null : selectedSeries?.values[inspectedIndex];
  const inspectedSweep = inspectedIndex == null ? null : sweepValues[inspectedIndex];
  const inspectedFailed = inspectedIndex != null && (statuses[inspectedIndex]?.status === "failed" || inspectedValue?.failed);

  if (!information) return null;

  const changeScope = (nextScope) => {
    setScope(nextScope);
    setSelectedSeriesKey(null);
    setSelectedPointIndex(null);
  };

  const changeMeasurement = (nextMeasurement) => {
    setMeasurement(nextMeasurement);
    setSelectedSeriesKey(null);
    setSelectedPointIndex(null);
  };

  const scopeSeries = getResultSeriesForScope(series, scope, effectiveMeasurement);
  const selectedSeriesIndex = Math.max(0, scopeSeries.findIndex((item) => item.key === selectedSeries?.key));

  return (
    <section aria-label="DC sweep results" className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
        <div className="border-b border-[#e4e7eb] px-4 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">DC Sweep Results</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-[#69717b]">
            <span className="font-medium text-[#17253a]">{sourceName}</span>
            <span>{formatNumber(information.start)} {parameterUnit} → {formatNumber(information.stop)} {parameterUnit}</span>
            <span>Step {formatNumber(information.step)} {parameterUnit}</span>
            <span>{sweepValues.length} points</span>
            {statuses.filter((item) => item.status === "failed").length > 0 && <span className="font-medium text-red-700">{statuses.filter((item) => item.status === "failed").length} failed</span>}
          </div>
        </div>

        <div className="border-b border-[#e4e7eb] px-4 pt-3">
          <div className="flex gap-1" role="tablist" aria-label="Result scope">
            {[RESULT_SCOPES.COMPONENTS, RESULT_SCOPES.NODES].map((item) => (
              <button key={item} type="button" role="tab" aria-selected={scope === item} onClick={() => changeScope(item)} className={`rounded-t-md px-3 py-2 text-xs font-medium ${scope === item ? "border border-b-white border-[#d9dde2] bg-white text-[#17253a]" : "text-[#69717b] hover:bg-[#f7f9fb]"}`}>
                {item === RESULT_SCOPES.COMPONENTS ? "Components" : "Nodes"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e7eb] bg-[#fafbfc] px-4 py-3">
          <div className="text-xs font-medium text-[#17253a]">{scope === RESULT_SCOPES.COMPONENTS ? `${scopeSeries.length} component results` : `${scopeSeries.length} node results`}</div>
          <div className="flex items-center gap-1 rounded-md border border-[#d9dde2] bg-white p-0.5" role="group" aria-label="Result measurement">
            {[RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER].map((item) => {
              const enabled = availableMeasurements.includes(item);
              return <button key={item} type="button" disabled={!enabled} aria-pressed={effectiveMeasurement === item} onClick={() => changeMeasurement(item)} className={`rounded px-2.5 py-1.5 text-[10px] font-medium ${effectiveMeasurement === item ? "bg-[#edf3f8] text-[#17253a]" : "text-[#69717b] hover:bg-[#f5f7f9]"} disabled:cursor-not-allowed disabled:opacity-35`}>{item === "voltage" ? "V" : item === "current" ? "I" : "P"}</button>;
            })}
          </div>
        </div>

        {scopeSeries.length > 0 ? (
          <div className="border-b border-[#e4e7eb] px-4 py-3">
            <label className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69717b]" htmlFor="sweep-result-target">Result</label>
            <select id="sweep-result-target" aria-label="Sweep result target" value={selectedSeries?.key ?? ""} onChange={(event) => { setSelectedSeriesKey(event.target.value); setSelectedPointIndex(null); }} className="mt-1.5 w-full rounded-md border border-[#d9dde2] bg-white px-2.5 py-2 text-xs text-[#26364d] outline-none focus:border-[#58718f]">
              {scopeSeries.map((item) => <option key={item.key} value={item.key}>{item.contextTitle}</option>)}
            </select>
          </div>
        ) : (
          <div className="border-b border-[#e4e7eb] px-4 py-5 text-xs text-[#69717b]">No {measurementLabel(effectiveMeasurement).toLowerCase()} results are available for this scope.</div>
        )}

        <SeriesContext result={result} series={selectedSeries} />

        {selectedPointIndex != null && inspectedSweep != null && selectedSeries && (
          <div className="border-b border-[#e4e7eb] px-4 py-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">Selected point</div><div className="mt-1 text-xs text-[#69717b]">{sourceName} = <span className="font-mono font-medium text-[#17253a]">{formatNumber(inspectedSweep)} {parameterUnit}</span></div></div>
              <div className="text-right"><div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#69717b]">{measurementLabel(effectiveMeasurement)}</div><div className={`mt-1 font-mono text-sm font-semibold ${inspectedFailed ? "text-red-700" : "text-[#17253a]"}`}>{inspectedFailed ? (statuses[inspectedIndex]?.error ?? inspectedValue?.error ?? "Failed") : formatEngineeringValue(inspectedValue?.value, selectedSeries.unit)}</div></div>
            </div>
          </div>
        )}

        <div className="p-3">
          {selectedSeries ? <ResultChart plot={plot} series={selectedSeries} /> : <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-[#d9dde2] bg-[#fafbfc] px-4 text-center text-xs text-[#69717b]">No circuit response datasets are available for this sweep.</div>}
        </div>
      </div>

      {scopeSeries.length > 1 && (
        <div className="rounded-xl border border-[#d9dde2] bg-white px-4 py-3 text-[10px] text-[#8a929c]">Showing {scopeSeries[selectedSeriesIndex]?.contextTitle ?? selectedSeries?.contextTitle} · {measurementLabel(effectiveMeasurement)} ({measurementUnit(effectiveMeasurement)})</div>
      )}
    </section>
  );
}
